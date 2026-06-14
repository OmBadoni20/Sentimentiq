# ============================================================
# SENTIMENTIQ — Basic Backend (No AI Model Yet)
# FastAPI only
# ============================================================

import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ============================================================
app = FastAPI(title="SentimentIQ API")

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173",
                   "http://localhost:5174",
                   "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

current_df = pd.DataFrame()

print("\n" + "="*50)
print("   SENTIMENTIQ BACKEND — Basic Version")
print("="*50 + "\n")


# ============================================================
# HELPERS
# ============================================================
def is_true(val):
    if pd.isna(val):
        return False
    return val == 1 or val == True or \
        str(val).strip().lower() in ['1', 'true', 'yes']


def find_col(df, *names):
    cols = [c.strip().lower().replace(' ', '') for c in df.columns]
    for n in names:
        n_clean = n.lower().replace(' ', '')
        for i, c in enumerate(cols):
            if c == n_clean:
                return df.columns[i]
    return None


def calculate_metrics() -> dict:
    global current_df
    if current_df.empty:
        return {"message": "No data uploaded yet.", "total": 0}

    df    = current_df
    total = len(df)

    csat_col   = find_col(df, 'ISHAPPY', 'CSAT')
    dsat_col   = find_col(df, 'ISSAD', 'DSAT')
    pass_col   = find_col(df, 'ISPASSIVE')
    sent_col   = find_col(df, 'Predicted_Sentiment', 'Sentiment')
    team_col   = find_col(df, 'TEAM', 'Department')
    region_col = find_col(df, 'REGION', 'Industry')

    csat_n = sum(1 for v in df[csat_col] if is_true(v)) if csat_col else 0
    dsat_n = sum(1 for v in df[dsat_col] if is_true(v)) if dsat_col else 0
    neu_n  = sum(1 for v in df[pass_col] if is_true(v)) if pass_col else 0

    if sent_col:
        pos_n = sum(1 for v in df[sent_col] if str(v).strip().lower() == 'positive')
        neg_n = sum(1 for v in df[sent_col] if str(v).strip().lower() == 'negative')
        neu_n = sum(1 for v in df[sent_col] if str(v).strip().lower() == 'neutral')
    else:
        pos_n, neg_n = csat_n, dsat_n

    pct = lambda n: round(n / total * 100, 1) if total else 0

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
                stats[k] = {'csat': 0, 'dsat': 0, 'total': 0}
            stats[k]['total'] += 1
            if is_true(row[csat_col]):
                stats[k]['csat'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[k]['dsat'] += 1

        result['team_breakdown'] = {
            t: {
                'csat_pct': round(v['csat']/v['total']*100, 1) if v['total'] else 0,
                'dsat_pct': round(v['dsat']/v['total']*100, 1) if v['total'] else 0,
                'total'   : v['total'],
            } for t, v in stats.items()
        }

    # Region breakdown
    if region_col and csat_col:
        stats = {}
        for _, row in df.iterrows():
            k = str(row[region_col]).strip()
            if not k or k == 'nan':
                continue
            if k not in stats:
                stats[k] = {'csat': 0, 'dsat': 0, 'total': 0}
            stats[k]['total'] += 1
            if is_true(row[csat_col]):
                stats[k]['csat'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[k]['dsat'] += 1

        result['region_breakdown'] = {
            r: {
                'csat_pct': round(v['csat']/v['total']*100, 1) if v['total'] else 0,
                'dsat_pct': round(v['dsat']/v['total']*100, 1) if v['total'] else 0,
                'total'   : v['total'],
            } for r, v in stats.items()
        }

    return result


# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {"message": "SentimentIQ Backend is running!"}


@app.get("/health")
def health():
    return {
        "status"   : "running",
        "data_rows": len(current_df),
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global current_df
    try:
        contents = await file.read()
        name = file.filename.lower()

        if name.endswith('.csv'):
            current_df = pd.read_csv(io.BytesIO(contents))
        elif name.endswith(('.xlsx', '.xls')):
            current_df = pd.read_excel(io.BytesIO(contents))
        elif name.endswith('.json'):
            current_df = pd.read_json(io.BytesIO(contents))
        else:
            raise HTTPException(400, "Only CSV, Excel, JSON accepted")

        current_df = current_df.fillna('')

        return {
            "message" : f"Uploaded {len(current_df)} rows",
            "rows"    : len(current_df),
            "columns" : list(current_df.columns),
            "filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/metrics")
def get_metrics():
    return calculate_metrics()


@app.get("/data")
def get_data(limit: int = 200):
    if current_df.empty:
        return {"rows": [], "total": 0}
    return {
        "rows"   : current_df.head(limit).to_dict(orient='records'),
        "total"  : len(current_df),
        "columns": list(current_df.columns),
    }


# ============================================================
if __name__ == "__main__":
    import uvicorn
    print("Starting server at http://localhost:8000")
    print("Docs at http://localhost:8000/docs\n")
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)




    pip install fastapi uvicorn pandas openpyxl python-multipart --trusted-host pypi.org --trusted-host files.pythonhosted.org
