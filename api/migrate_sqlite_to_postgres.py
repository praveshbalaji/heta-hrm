#!/usr/bin/env python3
"""
One-time copy of an existing SQLite database (heta.db) into PostgreSQL.

Usage (from the repo root):
    set DATABASE_URL=postgresql://user:pass@host/db?sslmode=require      (Windows)
    export DATABASE_URL=postgresql://user:pass@host/db?sslmode=require   (macOS/Linux)
    python api/migrate_sqlite_to_postgres.py [path/to/heta.db]

Rows already present in PostgreSQL (same id) are left untouched, except User rows,
which are overwritten so existing passwords carry over. Safe to run more than once.
Default source: backend/prisma/heta.db
"""

import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import database  # noqa: E402

TABLES = ["User", "Member", "Attendance", "LeaveRequest", "PasswordResetTokens",
          "Holiday", "EmailLogs", "GoogleSheetSync"]


def main():
    if not database.USE_POSTGRES:
        sys.exit("DATABASE_URL is not set to a postgresql:// URL. Aborting.")

    src_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(HERE), "backend", "prisma", "heta.db")
    if not os.path.exists(src_path):
        sys.exit(f"SQLite file not found: {src_path}")

    # Mark the database as already seeded so default demo rows are not mixed in
    boot = database.get_raw_connection()
    boot.execute("CREATE TABLE IF NOT EXISTS AppMeta (key TEXT PRIMARY KEY, value TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)")
    boot.execute("INSERT OR IGNORE INTO AppMeta (key, value) VALUES ('initial_seed', 'migrated-from-sqlite')")
    boot.close()
    database.init_db()  # create tables in Postgres
    src = sqlite3.connect(f"file:{src_path}?mode=ro", uri=True)
    src.row_factory = sqlite3.Row
    dst = database.get_connection()
    cur = dst.cursor()

    for table in TABLES:
        try:
            rows = src.execute(f"SELECT * FROM {table}").fetchall()
        except sqlite3.OperationalError:
            print(f"  {table}: not in source, skipped")
            continue
        dst_cols = database._table_columns(dst, cur, table)
        copied = 0
        for r in rows:
            cols = [c for c in r.keys() if c in dst_cols]
            if not cols:
                continue
            placeholders = ", ".join("?" for _ in cols)
            cur.execute(
                f"INSERT OR {'REPLACE' if table == 'User' else 'IGNORE'} INTO {table} ({', '.join(cols)}) VALUES ({placeholders})",
                [r[c] for c in cols],
            )
            copied += max(cur.rowcount, 0)
        print(f"  {table}: {copied} new of {len(rows)} rows")

    dst.close()
    print("Migration complete.")


if __name__ == "__main__":
    main()
