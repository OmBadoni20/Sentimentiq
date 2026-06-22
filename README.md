# ============================================================
# DATABASE SERVICE — SQLite
# ============================================================

import sqlite3
import json
import os
from datetime import datetime, date

# ── Load config ───────────────────────────────────────────
def load_config():
    config_path = os.path.join(
        os.path.dirname(__file__),
        '..', 'config.json'
    )
    with open(config_path, 'r') as f:
        return json.load(f)

CONFIG  = load_config()
DB_PATH = os.path.join(
    os.path.dirname(__file__),
    '..',
    CONFIG['database']['path']
)

print(f"[DBService] SQLite: {DB_PATH}")


# ── Convert any value to JSON safe type ───────────────────
def make_serializable(obj):
    """
    Converts pandas/numpy types to
    plain Python types that JSON can handle
    """
    if obj is None:
        return ''
    # Handle pandas Timestamp and datetime
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    # Handle numpy int/float
    if hasattr(obj, 'item'):
        return obj.item()
    # Handle date objects
    if isinstance(obj, (datetime, date)):
        return str(obj)
    # Handle NaN
    try:
        import math
        if math.isnan(float(obj)):
            return ''
    except:
        pass
    return obj


def clean_row(row: dict) -> dict:
    """
    Cleans entire row dictionary
    Makes all values JSON serializable
    """
    clean = {}
    for key, val in row.items():
        try:
            # Test if already serializable
            json.dumps(val)
            clean[str(key)] = val
        except (TypeError, ValueError):
            # Convert to string if not serializable
            clean[str(key)] = str(val)
    return clean


# ── Get connection ─────────────────────────────────────────
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Create tables ──────────────────────────────────────────
def init_database():
    """
    Creates tables if they don't exist
    Adds default users if table is empty
    Runs automatically on startup!
    """
    conn   = get_connection()
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY
                       AUTOINCREMENT,
            username   TEXT UNIQUE NOT NULL,
            password   TEXT NOT NULL,
            name       TEXT NOT NULL,
            role       TEXT NOT NULL
                       DEFAULT 'Viewer',
            is_active  INTEGER DEFAULT 1,
            created_at TEXT DEFAULT
                       (datetime('now'))
        )
    """)

    # Create feedback_data table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback_data (
            id          INTEGER PRIMARY KEY
                        AUTOINCREMENT,
            upload_id   TEXT NOT NULL,
            filename    TEXT NOT NULL,
            uploaded_by TEXT NOT NULL,
            uploaded_at TEXT DEFAULT
                        (datetime('now')),
            row_data    TEXT NOT NULL
        )
    """)

    # Insert default users if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]

    if count == 0:
        print("[DBService] Adding default users...")
        default_users = [
            ('om.badoni',  'NTT@2026',
             'Om Badoni',   'Developer'),
            ('manager',    'Manager@2026',
             'NTT Manager', 'Manager'),
            ('admin',      'Admin@2026',
             'Admin User',  'Admin'),
        ]
        cursor.executemany("""
            INSERT INTO users
                (username, password, name, role)
            VALUES (?, ?, ?, ?)
        """, default_users)
        print("[DBService] Default users added!")

    conn.commit()
    conn.close()
    print("[DBService] Database initialized!")


# ── Test connection ────────────────────────────────────────
def test_connection() -> bool:
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        print("[DBService] SQLite connected!")
        return True
    except Exception as e:
        print(f"[DBService] Error: {e}")
        return False


# ============================================================
# USER OPERATIONS
# ============================================================

def get_user_by_username(username: str):
    """
    Fetch user from users table by username
    Returns user dict or None
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, username, password,
                   name, role, is_active
            FROM   users
            WHERE  username  = ?
            AND    is_active = 1
        """, (username,))

        row = cursor.fetchone()
        conn.close()

        if row:
            print(f"[DBService] User found: "
                  f"{username}")
            return dict(row)

        print(f"[DBService] User not found: "
              f"{username}")
        return None

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return None


def get_all_users():
    """
    Returns all active users without passwords
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, username, name,
                   role, created_at
            FROM   users
            WHERE  is_active = 1
            ORDER  BY created_at ASC
        """)

        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def add_user(username, password,
             name, role='Viewer'):
    """Add new user to database"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO users
                (username, password, name, role)
            VALUES (?, ?, ?, ?)
        """, (username, password, name, role))

        conn.commit()
        conn.close()
        print(f"[DBService] User added: {username}")
        return True

    except sqlite3.IntegrityError:
        print(f"[DBService] User exists: {username}")
        return False
    except Exception as e:
        print(f"[DBService] Error: {e}")
        return False


def deactivate_user(username: str):
    """Disable user without deleting"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE users
            SET    is_active = 0
            WHERE  username  = ?
        """, (username,))

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return False


# ============================================================
# DATA OPERATIONS
# ============================================================

def save_upload(rows: list,
                filename: str,
                uploaded_by: str,
                upload_id: str):
    """
    Save uploaded rows to SQLite
    Handles Timestamp and all pandas types!
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # Clean each row before saving
        batch = []
        for row in rows:
            try:
                cleaned = clean_row(row)
                batch.append((
                    upload_id,
                    filename,
                    uploaded_by,
                    json.dumps(cleaned)
                ))
            except Exception as e:
                print(f"[DBService] Row skip: {e}")
                continue

        # Insert all rows at once
        cursor.executemany("""
            INSERT INTO feedback_data
                (upload_id, filename,
                 uploaded_by, row_data)
            VALUES (?, ?, ?, ?)
        """, batch)

        conn.commit()
        conn.close()

        print(f"[DBService] Saved {len(batch)} "
              f"rows → sentimentiq.db")
        return True

    except Exception as e:
        print(f"[DBService] Save error: {e}")
        return False


def get_upload_rows(upload_id: str,
                    limit: int = 10000):
    """
    Get rows for specific upload
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT row_data
            FROM   feedback_data
            WHERE  upload_id = ?
            LIMIT  ?
        """, (upload_id, limit))

        rows = cursor.fetchall()
        conn.close()

        return [
            json.loads(r['row_data'])
            for r in rows
        ]

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def get_all_uploads():
    """
    Get history of all uploaded files
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                upload_id,
                filename,
                uploaded_by,
                uploaded_at,
                COUNT(*) as row_count
            FROM  feedback_data
            GROUP BY
                upload_id,
                filename,
                uploaded_by,
                uploaded_at
            ORDER BY uploaded_at DESC
        """)

        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def get_latest_upload_id():
    """Get most recent upload_id"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT upload_id
            FROM   feedback_data
            ORDER  BY uploaded_at DESC
            LIMIT  1
        """)

        result = cursor.fetchone()
        conn.close()
        return result['upload_id'] if result else None

    except Exception as e:
        return None


def delete_upload(upload_id: str):
    """Delete all rows for an upload"""
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM feedback_data
            WHERE upload_id = ?
        """, (upload_id,))

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"[DBService] Delete error: {e}")
        return False








        # ============================================================
# DATA MICROSERVICE — SQLite version
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


# ── Helpers ───────────────────────────────────────────────
def is_true(val) -> bool:
    if pd.isna(val): return False
    return val == 1 or val == True or \
        str(val).strip().lower() in \
        ['1', 'true', 'yes']


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


# ── Upload file ───────────────────────────────────────────
def process_upload(contents: bytes,
                   filename: str,
                   uploaded_by: str = 'unknown'):
    global current_df, current_upload

    name = filename.lower()

    # Read file into DataFrame
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
            f"Unsupported file: {filename}")

    # Fill empty cells
    current_df = current_df.fillna('')

    # ── KEY FIX ──────────────────────────────
    # Convert ALL columns to string
    # This fixes Timestamp serialization error!
    for col in current_df.columns:
        current_df[col] = current_df[col].astype(str)
    # ─────────────────────────────────────────

    # Convert to list of dicts
    rows = current_df.to_dict(orient='records')

    # Generate unique upload ID
    upload_id = f"upload_{uuid.uuid4().hex[:8]}"

    # Save to SQLite database!
    saved = save_upload(
        rows        = rows,
        filename    = filename,
        uploaded_by = uploaded_by,
        upload_id   = upload_id,
    )

    # Update current upload info
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


# ── Get metrics ───────────────────────────────────────────
def get_metrics() -> dict:
    global current_df

    if current_df.empty:
        return {
            "message": "No data uploaded yet.",
            "total"  : 0
        }

    df    = current_df
    total = len(df)

    csat_col   = find_col(df,'ISHAPPY','CSAT')
    dsat_col   = find_col(df,'ISSAD','DSAT')
    pass_col   = find_col(df,'ISPASSIVE')
    sent_col   = find_col(df,
                  'Predicted_Sentiment',
                  'Sentiment')
    team_col   = find_col(df,'TEAM','Department')
    region_col = find_col(df,'REGION','Industry')

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
        n / total * 100, 1
    ) if total else 0

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
                    'csat':0, 'dsat':0, 'total':0
                }
            stats[k]['total'] += 1
            if is_true(row[csat_col]):
                stats[k]['csat'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[k]['dsat'] += 1

        result['team_breakdown'] = {
            t: {
                'csat_pct': round(
                    v['csat']/v['total']*100, 1
                ) if v['total'] else 0,
                'dsat_pct': round(
                    v['dsat']/v['total']*100, 1
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
                    'csat':0, 'dsat':0, 'total':0
                }
            stats[k]['total'] += 1
            if is_true(row[csat_col]):
                stats[k]['csat'] += 1
            if dsat_col and is_true(row[dsat_col]):
                stats[k]['dsat'] += 1

        result['region_breakdown'] = {
            r: {
                'csat_pct': round(
                    v['csat']/v['total']*100, 1
                ) if v['total'] else 0,
                'dsat_pct': round(
                    v['dsat']/v['total']*100, 1
                ) if v['total'] else 0,
                'total': v['total'],
            }
            for r, v in stats.items()
        }

    return result


# ── Get rows ──────────────────────────────────────────────
def get_data(limit: int = 200,
             upload_id: str = None) -> dict:
    global current_df, current_upload

    if upload_id:
        rows = get_upload_rows(upload_id, limit)
        return {
            "rows"     : rows,
            "total"    : len(rows),
            "upload_id": upload_id,
        }

    if not current_df.empty:
        rows = current_df.head(limit).to_dict(
            orient='records'
        )
        return {
            "rows"     : rows,
            "total"    : len(current_df),
            "upload_id": current_upload['upload_id'],
        }

    return {"rows": [], "total": 0}


# ── Get upload history ────────────────────────────────────
def get_uploads_history():
    return get_all_uploads()


# ── Get status ────────────────────────────────────────────
def get_status() -> dict:
    return {
        "data_loaded"   : not current_df.empty,
        "data_rows"     : len(current_df),
        "current_upload": current_upload,
        "columns"       : list(current_df.columns)
                          if not current_df.empty
                          else [],
    }
