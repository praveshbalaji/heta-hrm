"""
PostgreSQL compatibility layer for HETA-HRM.

The API was written against SQLite (sqlite3 + "?" placeholders + camelCase
columns). This module lets the exact same SQL run on a persistent PostgreSQL
database (Neon / Supabase / Vercel Postgres / any Postgres) by:

  * translating "?" placeholders to "%s" (and escaping literal "%")
  * double-quoting mixed-case identifiers (User, isDeleted, memberId, ...) so
    PostgreSQL keeps their case and the reserved word "User" works
  * rewriting INSERT OR IGNORE / INSERT OR REPLACE into ON CONFLICT clauses
  * mapping SQLite-only DDL types (BOOLEAN -> INTEGER, DATETIME -> TEXT) and
    CURRENT_TIMESTAMP to the same 'YYYY-MM-DD HH:MM:SS' text SQLite produces
  * returning rows that behave like sqlite3.Row (row["col"], row[0], dict(row))
"""

import re
import threading

import psycopg2
import psycopg2.extensions

TS_EXPR = "to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')"

_IDENT_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_INSERT_OR_RE = re.compile(
    r"^\s*INSERT\s+OR\s+(IGNORE|REPLACE)\s+INTO\s+(\w+)\s*\(([^)]*)\)",
    re.IGNORECASE,
)
_FK_RE = re.compile(
    r",\s*FOREIGN\s+KEY\s*\([^)]*\)\s*REFERENCES\s+\w+\s*\([^)]*\)(\s+ON\s+DELETE\s+CASCADE)?",
    re.IGNORECASE,
)
_TYPE_MAP = {"BOOLEAN": "INTEGER", "DATETIME": "TEXT"}

_cache = {}
_cache_lock = threading.Lock()


def _needs_quotes(word):
    return any(c.isupper() for c in word) and any(c.islower() for c in word)


def _rewrite_tokens(sql):
    """Single pass over the SQL text, leaving string literals and comments intact."""
    out = []
    i, n = 0, len(sql)
    while i < n:
        ch = sql[i]
        if ch == "'":  # string literal ('' is an escaped quote)
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            out.append(sql[i:j + 1].replace("%", "%%"))
            i = j + 1
        elif ch == '"':  # already-quoted identifier
            j = sql.find('"', i + 1)
            j = n - 1 if j == -1 else j
            out.append(sql[i:j + 1])
            i = j + 1
        elif ch == "-" and sql.startswith("--", i):  # line comment: drop it
            j = sql.find("\n", i)
            i = n if j == -1 else j
        elif ch == "?":
            out.append("%s")
            i += 1
        elif ch == "%":
            out.append("%%")
            i += 1
        elif ch.isalpha() or ch == "_":
            m = _IDENT_RE.match(sql, i)
            word = m.group(0)
            prev = sql[i - 1] if i > 0 else ""
            if prev.isalnum() or prev == "_":
                out.append(word)
            elif word == "CURRENT_TIMESTAMP":
                out.append(TS_EXPR)
            elif word in _TYPE_MAP:
                out.append(_TYPE_MAP[word])
            elif _needs_quotes(word):
                out.append(f'"{word}"')
            else:
                out.append(word)
            i = m.end()
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def translate(sql):
    cached = _cache.get(sql)
    if cached is not None:
        return cached

    text = _FK_RE.sub("", sql)
    suffix = ""
    m = _INSERT_OR_RE.match(text)
    if m:
        mode, table, cols = m.group(1).upper(), m.group(2), m.group(3)
        text = text[:m.start()] + f"INSERT INTO {table} ({cols})" + text[m.end():]
        if mode == "IGNORE":
            suffix = " ON CONFLICT DO NOTHING"
        else:
            col_names = [c.strip() for c in cols.split(",") if c.strip()]
            updates = ", ".join(f"{c} = excluded.{c}" for c in col_names if c.lower() != "id")
            suffix = f" ON CONFLICT (id) DO UPDATE SET {updates}" if updates else " ON CONFLICT DO NOTHING"
        text = text.rstrip().rstrip(";") + suffix

    result = _rewrite_tokens(text)
    with _cache_lock:
        if len(_cache) > 2000:
            _cache.clear()
        _cache[sql] = result
    return result


def _adapt_params(params):
    if params is None:
        return ()
    if isinstance(params, dict):
        return {k: (int(v) if isinstance(v, bool) else v) for k, v in params.items()}
    return tuple(int(v) if isinstance(v, bool) else v for v in params)


class Row(dict):
    """dict that also supports positional access like sqlite3.Row."""

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return dict.__getitem__(self, key)


class PgCursor:
    def __init__(self, conn):
        self._conn = conn
        self._cur = conn._raw.cursor()

    def execute(self, sql, params=None):
        self._cur.execute(translate(sql), _adapt_params(params))
        return self

    def executemany(self, sql, seq):
        q = translate(sql)
        for p in seq:
            self._cur.execute(q, _adapt_params(p))
        return self

    def _row(self, values):
        if values is None:
            return None
        cols = [d[0] for d in self._cur.description]
        return Row(zip(cols, values))

    def fetchone(self):
        if self._cur.description is None:
            return None
        return self._row(self._cur.fetchone())

    def fetchall(self):
        if self._cur.description is None:
            return []
        return [self._row(v) for v in self._cur.fetchall()]

    def fetchmany(self, size=None):
        if self._cur.description is None:
            return []
        rows = self._cur.fetchmany(size) if size else self._cur.fetchmany()
        return [self._row(v) for v in rows]

    def __iter__(self):
        return iter(self.fetchall())

    @property
    def rowcount(self):
        return self._cur.rowcount

    @property
    def lastrowid(self):
        return None

    @property
    def description(self):
        return self._cur.description

    def close(self):
        try:
            self._cur.close()
        except Exception:
            pass


class PgConnection:
    """
    sqlite3.Connection look-alike. Runs in autocommit mode so a failed statement
    never leaves the request's connection stuck in an aborted transaction (the
    existing code catches errors and keeps going, which SQLite tolerates).
    """

    def __init__(self, raw, pool_release=None):
        self._raw = raw
        self._release = pool_release
        self.row_factory = None

    def cursor(self):
        return PgCursor(self)

    def execute(self, sql, params=None):
        return self.cursor().execute(sql, params)

    def commit(self):
        pass  # autocommit

    def rollback(self):
        pass

    def close(self):
        if self._release:
            self._release(self._raw)
        else:
            self._raw.close()


# ------------------------------------------------------------------
# Connection reuse: serverless functions keep the process warm between
# requests, so we keep one live connection per thread instead of paying the
# TLS + auth handshake on every request.
# ------------------------------------------------------------------
_local = threading.local()


def _new_raw(dsn):
    raw = psycopg2.connect(dsn, connect_timeout=10)
    raw.set_session(autocommit=True)
    return raw


def _healthy(raw):
    if raw is None or raw.closed:
        return False
    try:
        if raw.get_transaction_status() == psycopg2.extensions.TRANSACTION_STATUS_UNKNOWN:
            return False
        with raw.cursor() as c:
            c.execute("SELECT 1")
        return True
    except Exception:
        return False


def connect(dsn):
    raw = getattr(_local, "raw", None)
    if not _healthy(raw):
        try:
            if raw is not None:
                raw.close()
        except Exception:
            pass
        raw = _new_raw(dsn)
        _local.raw = raw
    return PgConnection(raw, pool_release=lambda _r: None)


def table_columns(conn, table):
    cur = conn._raw.cursor()
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = %s",
        (table,),
    )
    return {r[0] for r in cur.fetchall()}
