# ============================================================
# AGENT DATABASE SERVICE
# Stores REAL records created by AI agents:
#   - tickets   (Ticket Router creates these)
#   - alerts    (Sentiment Analyst raises these)
#   - reports   (Research Reporter saves these)
#
# Includes automatic retry-on-lock: SQLite allows only one
# writer at a time. If a write collides with another write
# already in progress (e.g. a large data import still
# finishing), we retry briefly instead of failing silently.
# ============================================================

import sqlite3
import json
import time
from datetime import datetime

DB_PATH = "sentimentiq.db"


def get_conn():
    # timeout tells sqlite3 to wait up to N seconds for a lock
    # to clear before raising "database is locked" itself
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def _execute_with_retry(fn, retries=5, delay=0.3):
    """
    Runs a database operation, retrying automatically if it
    hits 'database is locked'. This handles the case where
    a large data import is still writing when an agent tries
    to write a ticket/alert/report at the same time.
    """
    last_error = None
    for attempt in range(retries):
        try:
            return fn()
        except sqlite3.OperationalError as e:
            if "locked" in str(e).lower():
                last_error = e
                print(f"[AgentDB] DB locked, retry {attempt+1}/{retries}...")
                time.sleep(delay)
                continue
            raise  # some other error — don't swallow it
    # ran out of retries
    raise last_error


# ── Create agent tables ───────────────────────────────────
def init_agent_tables():
    def _do():
        conn = get_conn()
        cur  = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id   TEXT UNIQUE,
                issue       TEXT,
                category    TEXT,
                priority    TEXT,
                team        TEXT,
                team_email  TEXT,
                status      TEXT DEFAULT 'Open',
                created_by  TEXT,
                created_at  TEXT
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type  TEXT,
                entity      TEXT,
                metric      TEXT,
                value       REAL,
                target      REAL,
                severity    TEXT,
                message     TEXT,
                status      TEXT DEFAULT 'Active',
                created_at  TEXT
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT,
                report_type TEXT,
                content     TEXT,
                created_by  TEXT,
                created_at  TEXT
            )
        """)

        conn.commit()
        conn.close()

    _execute_with_retry(_do)
    print("[AgentDB] Agent tables ready (tickets, alerts, reports)")


# ── TICKETS ───────────────────────────────────────────────
def create_ticket(ticket_id, issue, category, priority,
                  team, team_email, created_by):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO tickets
            (ticket_id, issue, category, priority,
             team, team_email, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?)
        """, (
            ticket_id, issue, category, priority,
            team, team_email, created_by,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        conn.commit()
        conn.close()
        return True
    return _execute_with_retry(_do)


def get_tickets(limit=200):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT * FROM tickets ORDER BY id DESC LIMIT ?", (limit,))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    return _execute_with_retry(_do)


def update_ticket_status(ticket_id, status):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("UPDATE tickets SET status = ? WHERE ticket_id = ?",
                    (status, ticket_id))
        conn.commit()
        conn.close()
        return True
    return _execute_with_retry(_do)


def get_ticket_stats():
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT COUNT(*) as c FROM tickets")
        total = cur.fetchone()['c']
        cur.execute("SELECT status, COUNT(*) as c FROM tickets GROUP BY status")
        by_status = {r['status']: r['c'] for r in cur.fetchall()}
        cur.execute("SELECT priority, COUNT(*) as c FROM tickets GROUP BY priority")
        by_priority = {r['priority']: r['c'] for r in cur.fetchall()}
        conn.close()
        return {"total": total, "by_status": by_status, "by_priority": by_priority}
    return _execute_with_retry(_do)


# ── ALERTS ────────────────────────────────────────────────
def create_alert(alert_type, entity, metric,
                 value, target, severity, message):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            SELECT id FROM alerts
            WHERE entity = ? AND metric = ? AND status = 'Active'
        """, (entity, metric))
        if cur.fetchone():
            conn.close()
            return False  # already exists — no duplicate

        cur.execute("""
            INSERT INTO alerts
            (alert_type, entity, metric, value, target,
             severity, message, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?)
        """, (
            alert_type, entity, metric, value, target,
            severity, message,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        conn.commit()
        conn.close()
        return True
    return _execute_with_retry(_do)


def get_alerts(limit=200):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    return _execute_with_retry(_do)


def resolve_alert(alert_id):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("UPDATE alerts SET status = 'Resolved' WHERE id = ?", (alert_id,))
        conn.commit()
        conn.close()
        return True
    return _execute_with_retry(_do)


# ── REPORTS ───────────────────────────────────────────────
def save_report(title, report_type, content, created_by):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO reports
            (title, report_type, content, created_by, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            title, report_type, content, created_by,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        conn.commit()
        report_id = cur.lastrowid
        conn.close()
        return report_id
    return _execute_with_retry(_do)


def get_reports(limit=100):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            SELECT id, title, report_type, created_by, created_at
            FROM reports ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    return _execute_with_retry(_do)


def get_report_content(report_id):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    return _execute_with_retry(_do)


def delete_report(report_id):
    def _do():
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        conn.commit()
        conn.close()
        return True
    return _execute_with_retry(_do)