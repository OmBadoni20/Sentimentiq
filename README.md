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
    """
    Converts all values to JSON
    serializable types
    Handles pandas Timestamp, numpy etc.
    """
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
    Creates tables if not exist
    Adds default users if empty
    Runs on every startup!
    """
    conn   = get_connection()
    cursor = conn.cursor()

    # Users table
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

    # Feedback data table
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

    # Add default users if table empty
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
    """Fetch user from DB by username"""
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
    """Returns all active users without passwords"""
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

    ── KEY FIX ──────────────────────────────
    Deletes ALL old data before saving new!
    DB always has only LATEST import!
    No duplicates ever!
    ─────────────────────────────────────────
    """
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # ── DELETE OLD DATA FIRST! ────────
        cursor.execute(
            "DELETE FROM feedback_data"
        )
        deleted = cursor.rowcount
        if deleted > 0:
            print(f"[DBService] Cleared "
                  f"{deleted} old rows from DB")
        # ─────────────────────────────────

        # Clean and prepare batch
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

        # Insert all new rows at once
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
    """Get rows for specific upload"""
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
    """Get history of all uploaded files"""
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
    """Delete rows for specific upload"""
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
