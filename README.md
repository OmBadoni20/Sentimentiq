# ============================================================
# DATA MICROSERVICE — Fixed Version
# ============================================================

import io
import uuid
import pandas as pd

from services.db_service import (
    save_upload,
    get_upload_rows,
    get_all_uploads,
    test_connection,
)

print("[DataService] Data microservice loaded")

current_df     = pd.DataFrame()
current_upload = {
    'upload_id'  : None,
    'filename'   : None,
    'uploaded_by': None,
    'rows'       : 0,
}


# ── KEY FIX — handles "1.0" "1" 1 True ───────────────────
def is_true(val) -> bool:
    try:
        if pd.isna(val):
            return False
    except:
        pass
    if val == 1 or val == True:
        return True
    s = str(val).strip().lower()
    # handles "1", "1.0", "true", "yes"
    return s in ['1', '1.0', 'true', 'yes']


def find_col(df, *names):
    cols = [
        c.strip().lower().replace(' ', '')
        for c in df.columns
    ]
    for n in names:
        n_clean = n.lower().replace(' ', '')
        for i, c in enumerate(cols):
            if c == n_clean:
                return df.columns[i]
    return None


def process_upload(contents: bytes,
                   filename: str,
                   uploaded_by: str = 'unknown'):
    global current_df, current_upload

    name = filename.lower()

    if name.endswith('.csv'):
        current_df = pd.read_csv(
            io.BytesIO(contents))
    elif name.endswith(('.xlsx', '.xls')):
        current_df = pd.read_excel(
            io.BytesIO(contents))
    elif name.endswith('.json'):
        current_df = pd.read_json(
            io.BytesIO(contents))
    else:
        raise ValueError(
            f"Unsupported: {filename}")

    current_df = current_df.fillna('')

    # Save copy for metrics BEFORE
    # converting to string
    metrics_df = current_df.copy()

    # Convert to string for DB storage
    str_df = current_df.copy()
    for col in str_df.columns:
        str_df[col] = str_df[col].astype(str)

    rows      = str_df.to_dict(orient='records')
    upload_id = f"upload_{uuid.uuid4().hex[:8]}"

    # Save string version to DB
    save_upload(
        rows        = rows,
        filename    = filename,
        uploaded_by = uploaded_by,
        upload_id   = upload_id,
    )

    # Keep ORIGINAL df in memory for metrics!
    current_df = metrics_df

    current_upload = {
        'upload_id'  : upload_id,
        'filename'   : filename,
        'uploaded_by': uploaded_by,
        'rows'       : len(rows),
    }

    print(f"[DataService] {len(rows)} rows "
          f"saved to sentimentiq.db!")

    return {
        "message"  : f"Uploaded {len(rows)} rows",
        "rows"     : len(rows),
        "columns"  : list(current_df.columns),
        "filename" : filename,
        "upload_id": upload_id,
    }


def get_metrics() -> dict:
    global current_df

    try:
        if current_df.empty:
            return {
                "message": "No data uploaded yet.",
                "total"  : 0
            }

        df    = current_df.copy()
        total = len(df)

        csat_col   = find_col(df,'ISHAPPY','CSAT')
        dsat_col   = find_col(df,'ISSAD','DSAT')
        pass_col   = find_col(df,'ISPASSIVE')
        sent_col   = find_col(df,
                      'Predicted_Sentiment',
                      'Sentiment')
        team_col   = find_col(df,'TEAM','Department')
        region_col = find_col(df,'REGION','Industry')

        print(f"[DataService] Columns found:")
        print(f"  CSAT col: {csat_col}")
        print(f"  DSAT col: {dsat_col}")
        if csat_col:
            sample = df[csat_col].head(3).tolist()
            print(f"  Sample values: {sample}")
            print(f"  Types: {[type(v) for v in sample]}")

        csat_n = sum(
            1 for v in df[csat_col]
            if is_true(v)
        ) if csat_col else 0

        dsat_n = sum(
            1 for v in df[dsat_col]
            if is_true(v)
        ) if dsat_col else 0

        neu_n = sum(
            1 for v in df[pass_col]
            if is_true(v)
        ) if pass_col else 0

        print(f"[DataService] csat_n={csat_n} "
              f"dsat_n={dsat_n} total={total}")

        if sent_col:
            pos_n = sum(
                1 for v in df[sent_col]
                if str(v).strip().lower()=='positive'
            )
            neg_n = sum(
                1 for v in df[sent_col]
                if str(v).strip().lower()=='negative'
            )
            neu_n = sum(
                1 for v in df[sent_col]
                if str(v).strip().lower()=='neutral'
            )
        else:
            pos_n = csat_n
            neg_n = dsat_n

        pct = lambda n: round(
            n/total*100, 1) if total else 0

        result = {
            "total"      : total,
            "csat_pct"   : pct(csat_n),
            "dsat_pct"   : pct(dsat_n),
            "neutral_pct": pct(neu_n),
            "csat_n"     : csat_n,
            "dsat_n"     : dsat_n,
            "neutral_n"  : neu_n,
            "pos_n"      : pos_n,
            "neg_n"      : neg_n,
        }

        # Team breakdown
        if team_col and csat_col:
            stats = {}
            for _, row in df.iterrows():
                k = str(row[team_col]).strip()
                if not k or k == 'nan':
                    continue
                if k not in stats:
                    stats[k] = {
                        'csat':0,'dsat':0,'total':0
                    }
                stats[k]['total'] += 1
                if is_true(row[csat_col]):
                    stats[k]['csat'] += 1
                if dsat_col and is_true(
                    row[dsat_col]):
                    stats[k]['dsat'] += 1

            result['team_breakdown'] = {
                t: {
                    'csat_pct': round(
                        v['csat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'dsat_pct': round(
                        v['dsat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'total': v['total'],
                }
                for t, v in stats.items()
            }

        # Region breakdown
        if region_col and csat_col:
            stats = {}
            for _, row in df.iterrows():
                k = str(row[region_col]).strip()
                if not k or k == 'nan':
                    continue
                if k not in stats:
                    stats[k] = {
                        'csat':0,'dsat':0,'total':0
                    }
                stats[k]['total'] += 1
                if is_true(row[csat_col]):
                    stats[k]['csat'] += 1
                if dsat_col and is_true(
                    row[dsat_col]):
                    stats[k]['dsat'] += 1

            result['region_breakdown'] = {
                r: {
                    'csat_pct': round(
                        v['csat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'dsat_pct': round(
                        v['dsat']/v['total']*100,1
                    ) if v['total'] else 0,
                    'total': v['total'],
                }
                for r, v in stats.items()
            }

        return result

    except Exception as e:
        print(f"[DataService] metrics error: {e}")
        import traceback
        traceback.print_exc()
        return {"total": 0, "error": str(e)}


def get_data(limit: int = 5000,
             upload_id: str = None) -> dict:
    """
    Returns from memory (current_df)
    ALL rows available!
    Fast and no serialization issues!
    """
    global current_df, current_upload

    try:
        # Use in-memory DataFrame!
        # All rows available!
        if not current_df.empty:
            df_copy = current_df.copy()

            # Convert safely to strings
            for col in df_copy.columns:
                df_copy[col] = (
                    df_copy[col]
                    .astype(str)
                    .replace('nan', '')
                    .replace('None', '')
                )

            rows = df_copy.to_dict(
                orient='records')

            print(f"[DataService] Returning "
                  f"{len(rows)} rows from memory")

            return {
                "rows"     : rows,
                "total"    : len(rows),
                "upload_id": current_upload[
                    'upload_id'],
            }

        return {"rows": [], "total": 0}

    except Exception as e:
        print(f"[DataService] get_data error: {e}")
        import traceback
        traceback.print_exc()
        return {"rows": [], "total": 0}


def get_uploads_history():
    return get_all_uploads()


def get_status() -> dict:
    return {
        "data_loaded"   : not current_df.empty,
        "data_rows"     : len(current_df),
        "current_upload": current_upload,
        "columns"       : list(current_df.columns)
                          if not current_df.empty
                          else [],
    }