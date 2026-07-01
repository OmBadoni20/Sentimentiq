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


# ── Make any value JSON safe ──────────────────────────────
def clean_row(row: dict) -> dict:
    clean = {}
    for key, val in row.items():
        try:
            json.dumps(val)
            clean[str(key)] = val
        except (TypeError, ValueError):
            clean[str(key)] = str(val)
    return clean


# ── Get connection ─────────────────────────────────────────
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Create tables on startup ───────────────────────────────
def init_database():
    """
    Creates tables if not exist.
    Adds default users if empty — passwords are hashed
    with bcrypt before being stored (see auth_service.py).
    """
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            username   TEXT UNIQUE NOT NULL,
            password   TEXT NOT NULL,
            name       TEXT NOT NULL,
            role       TEXT NOT NULL DEFAULT 'Viewer',
            is_active  INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback_data (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id   TEXT NOT NULL,
            filename    TEXT NOT NULL,
            uploaded_by TEXT NOT NULL,
            uploaded_at TEXT DEFAULT (datetime('now')),
            row_data    TEXT NOT NULL
        )
    """)

    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]

    if count == 0:
        print("[DBService] Adding default users (hashed passwords)...")
        # Import here to avoid circular import at module load time
        from services.auth_service import hash_password

        default_users = [
            ('om.badoni', hash_password('NTT@2026'),
             'Om Badoni',   'Developer'),
            ('manager',   hash_password('Manager@2026'),
             'NTT Manager', 'Manager'),
            ('admin',     hash_password('Admin@2026'),
             'Admin User',  'Admin'),
        ]
        cursor.executemany("""
            INSERT INTO users (username, password, name, role)
            VALUES (?, ?, ?, ?)
        """, default_users)
        print("[DBService] Default users added (hashed)!")

    conn.commit()
    conn.close()
    print("[DBService] Database initialized!")


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
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, password, name, role, is_active
            FROM   users
            WHERE  username  = ?
            AND    is_active = 1
        """, (username,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None
    except Exception as e:
        print(f"[DBService] Error: {e}")
        return None


def get_all_users():
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, name, role, created_at
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


def add_user(username, password_hash, name, role='Viewer'):
    """
    NOTE: 'password_hash' must already be hashed by the caller
    (auth_service.register_user does this). This function
    never hashes — it only stores what it's given.
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (username, password, name, role)
            VALUES (?, ?, ?, ?)
        """, (username, password_hash, name, role))
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
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users SET is_active = 0 WHERE username = ?
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

def save_upload(rows: list, filename: str, uploaded_by: str, upload_id: str):
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM feedback_data")
        deleted = cursor.rowcount
        if deleted > 0:
            print(f"[DBService] Cleared {deleted} old rows from DB")

        batch = []
        for row in rows:
            try:
                cleaned = clean_row(row)
                batch.append((upload_id, filename, uploaded_by, json.dumps(cleaned)))
            except Exception as e:
                print(f"[DBService] Row skip: {e}")
                continue

        cursor.executemany("""
            INSERT INTO feedback_data (upload_id, filename, uploaded_by, row_data)
            VALUES (?, ?, ?, ?)
        """, batch)

        conn.commit()
        conn.close()
        print(f"[DBService] Saved {len(batch)} rows -> sentimentiq.db")
        return True
    except Exception as e:
        print(f"[DBService] Save error: {e}")
        return False


def get_upload_rows(upload_id: str, limit: int = 10000):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT row_data FROM feedback_data
            WHERE upload_id = ? LIMIT ?
        """, (upload_id, limit))
        rows = cursor.fetchall()
        conn.close()
        return [json.loads(r['row_data']) for r in rows]
    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def get_all_uploads():
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT upload_id, filename, uploaded_by, uploaded_at,
                   COUNT(*) as row_count
            FROM  feedback_data
            GROUP BY upload_id, filename, uploaded_by, uploaded_at
            ORDER BY uploaded_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"[DBService] Error: {e}")
        return []


def get_latest_upload_id():
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT upload_id FROM feedback_data
            ORDER BY uploaded_at DESC LIMIT 1
        """)
        result = cursor.fetchone()
        conn.close()
        return result['upload_id'] if result else None
    except Exception:
        return None


def delete_upload(upload_id: str):
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM feedback_data WHERE upload_id = ?", (upload_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"[DBService] Delete error: {e}")
        return False