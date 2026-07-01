# ============================================================
# CLEAR OPERATIONS DATA
# Wipes tickets, alerts, and reports for a clean demo.
# Keeps users and imported-data structure intact.
# Run with:  python clear_ops.py
# ============================================================

import sqlite3

DB = "sentimentiq.db"

conn = sqlite3.connect(DB)
cur  = conn.cursor()

# Count before
def count(table):
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]
    except Exception:
        return 0

print("Before:")
print(f"  Tickets: {count('tickets')}")
print(f"  Alerts : {count('alerts')}")
print(f"  Reports: {count('reports')}")

# Clear
cur.execute("DELETE FROM tickets")
cur.execute("DELETE FROM alerts")
cur.execute("DELETE FROM reports")
conn.commit()

print("\nCleared all tickets, alerts, and reports!")
print("Users and login info are untouched.")

conn.close()