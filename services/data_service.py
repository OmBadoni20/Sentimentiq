# ============================================================
# DATA MICROSERVICE — Complete Correct Version
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


def is_true(val) -> bool:
    try:
        if pd.isna(val): return False
    except: pass
    if val == 1 or val == True: return True
    s = str(val).strip().lower()
    return s in ['1', '1.0', 'true', 'yes']


def find_col(df, *names):
    """
    Finds column ignoring case, spaces,
    underscores and hyphens
    Type_of_Data == TypeofData == type of data
    """
    cols_clean = [
        c.strip().lower()
         .replace(' ','').replace('_','').replace('-','')
        for c in df.columns
    ]
    for n in names:
        n_clean = (n.strip().lower()
                    .replace(' ','').replace('_','')
                    .replace('-',''))
        for i, col in enumerate(cols_clean):
            if col == n_clean:
                return df.columns[i]
    return None


def safe_str(val):
    if val is None: return ''
    s = str(val).strip()
    if s.lower() in ['nan','none','nat','n/a','']: return ''
    return s


def process_upload(contents: bytes,
                   filename: str,
                   uploaded_by: str = 'unknown'):
    global current_df, current_upload

    name = filename.lower()
    if name.endswith('.csv'):
        current_df = pd.read_csv(io.BytesIO(contents))
    elif name.endswith(('.xlsx','.xls')):
        current_df = pd.read_excel(io.BytesIO(contents))
    elif name.endswith('.json'):
        current_df = pd.read_json(io.BytesIO(contents))
    else:
        raise ValueError(f"Unsupported file: {filename}")

    current_df = current_df.fillna('')

    print(f"[DataService] Loaded {len(current_df)} rows")
    print(f"[DataService] Columns: {list(current_df.columns)}")

    metrics_df = current_df.copy()

    str_df = current_df.copy()
    for col in str_df.columns:
        str_df[col] = str_df[col].astype(str)

    rows_for_db = str_df.to_dict(orient='records')
    upload_id   = f"upload_{uuid.uuid4().hex[:8]}"

    save_upload(
        rows        = rows_for_db,
        filename    = filename,
        uploaded_by = uploaded_by,
        upload_id   = upload_id,
    )

    current_df = metrics_df
    current_upload = {
        'upload_id'  : upload_id,
        'filename'   : filename,
        'uploaded_by': uploaded_by,
        'rows'       : len(rows_for_db),
    }

    rows_for_frontend = []
    for row in rows_for_db:
        clean = {}
        for k, v in row.items():
            v = str(v) if v is not None else ''
            v = '' if v in ['nan','None','NaN','nat','NaT'] else v
            clean[str(k)] = v
        rows_for_frontend.append(clean)

    print(f"[DataService] {len(rows_for_db)} rows saved!")

    return {
        "message"  : f"Uploaded {len(rows_for_db)} rows",
        "rows"     : len(rows_for_db),
        "columns"  : list(current_df.columns),
        "filename" : filename,
        "upload_id": upload_id,
        "data"     : rows_for_frontend,
    }


def get_metrics() -> dict:
    global current_df
    try:
        if current_df.empty:
            return {"message":"No data uploaded yet.","total":0}

        df    = current_df.copy()
        total = len(df)

        csat_col   = find_col(df,'ISHAPPY','CSAT','Satisfied')
        dsat_col   = find_col(df,'ISSAD','DSAT','Dissatisfied')
        pass_col   = find_col(df,'ISPASSIVE','Neutral','Passive')
        sent_col   = find_col(df,'Predicted_Sentiment','Sentiment')
        team_col   = find_col(df,'TEAM','Department','Team')
        region_col = find_col(df,'REGION','Industry','Region')

        print(f"[DataService] CSAT col: {csat_col}, DSAT col: {dsat_col}")

        csat_n = sum(1 for v in df[csat_col] if is_true(v)) if csat_col else 0
        dsat_n = sum(1 for v in df[dsat_col] if is_true(v)) if dsat_col else 0
        neu_n  = sum(1 for v in df[pass_col] if is_true(v)) if pass_col else 0

        print(f"[DataService] csat={csat_n} dsat={dsat_n} total={total}")

        if sent_col:
            pos_n = sum(1 for v in df[sent_col] if str(v).strip().lower()=='positive')
            neg_n = sum(1 for v in df[sent_col] if str(v).strip().lower()=='negative')
            neu_n = sum(1 for v in df[sent_col] if str(v).strip().lower()=='neutral')
        else:
            pos_n = csat_n
            neg_n = dsat_n

        pct = lambda n: round(n/total*100,1) if total else 0

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

        if team_col and csat_col:
            stats = {}
            for _, row in df.iterrows():
                k = safe_str(row[team_col])
                if not k: continue
                if k not in stats:
                    stats[k] = {'csat':0,'dsat':0,'total':0}
                stats[k]['total'] += 1
                if is_true(row[csat_col]): stats[k]['csat'] += 1
                if dsat_col and is_true(row[dsat_col]): stats[k]['dsat'] += 1
            result['team_breakdown'] = {
                t:{'csat_pct':round(v['csat']/v['total']*100,1) if v['total'] else 0,
                   'dsat_pct':round(v['dsat']/v['total']*100,1) if v['total'] else 0,
                   'total':v['total']}
                for t,v in stats.items()
            }

        if region_col and csat_col:
            stats = {}
            for _, row in df.iterrows():
                k = safe_str(row[region_col])
                if not k: continue
                if k not in stats:
                    stats[k] = {'csat':0,'dsat':0,'total':0}
                stats[k]['total'] += 1
                if is_true(row[csat_col]): stats[k]['csat'] += 1
                if dsat_col and is_true(row[dsat_col]): stats[k]['dsat'] += 1
            result['region_breakdown'] = {
                r:{'csat_pct':round(v['csat']/v['total']*100,1) if v['total'] else 0,
                   'dsat_pct':round(v['dsat']/v['total']*100,1) if v['total'] else 0,
                   'total':v['total']}
                for r,v in stats.items()
            }

        return result

    except Exception as e:
        print(f"[DataService] metrics error: {e}")
        import traceback; traceback.print_exc()
        return {"total":0,"error":str(e)}


def get_data(limit: int = 5000, upload_id: str = None) -> dict:
    global current_df, current_upload
    try:
        if not current_df.empty:
            df_copy = current_df.copy()
            for col in df_copy.columns:
                df_copy[col] = (df_copy[col].astype(str)
                                .replace('nan','')
                                .replace('None','')
                                .replace('NaT',''))
            rows = df_copy.to_dict(orient='records')
            return {"rows":rows,"total":len(rows),
                    "upload_id":current_upload['upload_id']}
        return {"rows":[],"total":0}
    except Exception as e:
        print(f"[DataService] get_data error: {e}")
        return {"rows":[],"total":0}


def get_effective_data(limit: int = 99999) -> dict:
    """
    Returns Name, Email, Comments,
    Type_of_Data, Type_of_Issue, Sentiment
    Works with any column naming style!
    """
    global current_df
    try:
        if current_df.empty:
            return {"rows":[],"total":0}

        df    = current_df.copy()
        total = len(df)

        print(f"[DataService] All columns: {list(df.columns)}")

        name_col    = find_col(df,'Name','CustomerName','Customer',
                               'FullName','Employee','PersonName',
                               'EmployeeName')
        email_col   = find_col(df,'Email','EmailID','Email_ID',
                               'CustomerEmail','EmployeeEmail',
                               'EmailAddress','Mail')
        comment_col = find_col(df,'Comments','Comment','Feedback',
                               'Description','Issue','Text',
                               'Message','FeedbackText','Notes',
                               'IssueDescription','CustomerFeedback')
        type_col    = find_col(df,'Type_of_Data','TypeofData',
                               'DataType','Type','Category',
                               'IssueCategory','DataCategory',
                               'FeedbackType')
        issue_col   = find_col(df,'Type_of_Issue','TypeofIssue',
                               'IssueType','Issue_Type',
                               'IssueName','Problem',
                               'TicketType','TypeIssue')
        dsat_col    = find_col(df,'ISSAD','DSAT','Dissatisfied',
                               'IsNegative','IsSad')
        csat_col    = find_col(df,'ISHAPPY','CSAT','Satisfied',
                               'IsPositive','IsHappy')

        print(f"[DataService] Column mapping:")
        print(f"  Name    -> {name_col}")
        print(f"  Email   -> {email_col}")
        print(f"  Comment -> {comment_col}")
        print(f"  Type    -> {type_col}")
        print(f"  Issue   -> {issue_col}")

        result_rows = []
        for _, row in df.iterrows():
            r = {}
            r['Name']          = safe_str(row[name_col])    if name_col    else 'N/A'
            r['Email']         = safe_str(row[email_col])   if email_col   else 'N/A'
            r['Comments']      = safe_str(row[comment_col]) if comment_col else 'N/A'
            r['Type_of_Data']  = safe_str(row[type_col])    if type_col    else 'N/A'
            r['Type_of_Issue'] = safe_str(row[issue_col])   if issue_col   else 'N/A'

            if dsat_col and is_true(row[dsat_col]):
                r['Sentiment'] = 'Negative'
            elif csat_col and is_true(row[csat_col]):
                r['Sentiment'] = 'Positive'
            else:
                r['Sentiment'] = 'Neutral'

            for k in r:
                if not r[k] or r[k] == '':
                    r[k] = 'N/A'

            result_rows.append(r)

        order = {'Negative':0,'Neutral':1,'Positive':2}
        result_rows.sort(key=lambda x: order.get(x.get('Sentiment','Neutral'),1))

        print(f"[DataService] Effective data: {len(result_rows)} rows ready")

        return {"rows":result_rows[:limit],"total":len(result_rows)}

    except Exception as e:
        print(f"[DataService] effective error: {e}")
        import traceback; traceback.print_exc()
        return {"rows":[],"total":0}


def get_repetitive_issues() -> dict:
    global current_df
    try:
        if current_df.empty:
            return {"issues":[],"total":0}

        df    = current_df.copy()
        total = len(df)

        issue_col = find_col(df,'Type_of_Issue','TypeofIssue',
                             'IssueType','Issue_Type','IssueName',
                             'Problem','TicketType','TypeIssue',
                             'Type_of_Data','TypeofData',
                             'Category','DataType')
        dsat_col  = find_col(df,'ISSAD','DSAT','Dissatisfied')
        csat_col  = find_col(df,'ISHAPPY','CSAT','Satisfied')

        if not issue_col:
            print(f"[DataService] No issue column found!")
            print(f"  Available: {list(df.columns)}")
            return {"issues":[],"total":0,
                    "message":"No issue type column found"}

        print(f"[DataService] Issue col: {issue_col}")

        stats = {}
        for _, row in df.iterrows():
            issue = safe_str(row[issue_col])
            if not issue or issue == 'N/A': continue
            if issue not in stats:
                stats[issue] = {'count':0,'negative':0,'positive':0}
            stats[issue]['count'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[issue]['negative'] += 1
            elif csat_col and is_true(row[csat_col]):
                stats[issue]['positive'] += 1

        issues = []
        for issue, data in stats.items():
            count = data['count']
            issues.append({
                'issue'     : issue,
                'count'     : count,
                'percentage': round(count/total*100,1) if total else 0,
                'negative'  : data['negative'],
                'positive'  : data['positive'],
                'neg_pct'   : round(data['negative']/count*100,1) if count else 0,
            })

        issues.sort(key=lambda x: x['count'], reverse=True)
        print(f"[DataService] Repetitive issues: {len(issues)} types")

        return {"issues":issues,"total":total,"unique_issues":len(issues)}

    except Exception as e:
        print(f"[DataService] repetitive error: {e}")
        import traceback; traceback.print_exc()
        return {"issues":[],"total":0}


def get_uploads_history():
    return get_all_uploads()


def get_status() -> dict:
    return {
        "data_loaded"   : not current_df.empty,
        "data_rows"     : len(current_df),
        "current_upload": current_upload,
        "columns"       : list(current_df.columns) if not current_df.empty else [],
    }
