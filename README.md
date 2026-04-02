# OneDB

OneDB is a lightweight database workspace that combines a React frontend with a PHP runtime and can be shipped as a **single `OneDB.php` file**.

It is designed for quick database operations: connect, inspect schema, browse table data, run SQL, and import/export datasets from one interface.

## Highlights

- Multi-engine support: **MySQL**, **PostgreSQL**, and **SQLite**
- Interactive workspace for database and table navigation
- SQL runner with result/mutation output and execution timing
- Table browsing with pagination, sorting, and filters
- Import support: `.csv`, `.xlsx/.xls`, `.sql`, `.zip` (`.sql.zip`)
- Export support: `.csv`, `.json`, `.sql`
- CSRF-protected API requests
- Optional readonly mode with `ONEDB_READONLY=1`
- Production packaging into a single `release/OneDB.php`

## Project Structure

- `frontend/` React + Vite application (development UI)
- `backend/src/runtime.php` API dispatcher/orchestrator
- `backend/src/Database/` Database connection, query, and metadata services
- `backend/src/Http/` Request/session/response helpers
- `backend/src/Support/` Environment and runtime utility helpers
- `backend/src/bootstrap.php` Development source loader
- `backend/public/index.php` Development backend entrypoint
- `build/pack-release.mjs` Release packer
- `build.sh` End-to-end build pipeline
- `release/OneDB.php` Generated single-file artifact

## Architecture Overview

### Frontend

The UI is a React workspace (`frontend/src/DatabaseManager.jsx`) organized around view-model hooks. It manages:

- connection flow and session state
- workspace interactions (navigation, SQL editor, table view)
- import/export actions
- notifications and persistence helpers

### Backend Runtime

The PHP runtime dispatches API actions and delegates DB access to modular service classes under `backend/src/Database`.

Main API actions:

- `csrf`
- `ping`
- `upload_limits`
- `test_connection`
- `list_databases`
- `list_tables`
- `browse_table`
- `query`

## Requirements

- Node.js + npm (for frontend development/build)
- PHP 8+ with PDO extensions for your target DB engines

## Local Development

### 1. Install frontend dependencies

```bash
npm --prefix frontend install
```

### 2. Run frontend dev server

```bash
npm --prefix frontend run dev
```

Frontend URL:

- `http://localhost:5173`

### 3. Run backend dev server

```bash
php -S localhost:8080 -t backend/public
```

Backend URL:

- `http://localhost:8080`

The backend allows CORS for local frontend origins (`localhost:5173` / `127.0.0.1:5173`).

## Build Release (`OneDB.php`)

```bash
./build.sh
```

Build flow:

1. Install frontend dependencies if missing
2. Run backend smoke tests (`php tests/backend/smoke.php`)
3. Build frontend with `ONEDB_EMBEDDED=1`
4. Pack frontend output + PHP runtime into `release/OneDB.php`

## Backend Smoke Tests

Run manually:

```bash
php tests/backend/smoke.php
```

Covered API actions:

- `ping`
- `upload_limits`
- `csrf`
- `test_connection` (SQLite)
- `list_databases` (SQLite)
- `list_tables` (SQLite)
- `browse_table` (SQLite)
- `query` (mutation + result set + readonly behavior)
- method/content-type/CSRF enforcement checks

## Security Notes

- CSRF token validation is enforced for mutating API requests.
- Non-API-safe HTTP methods are rejected per action (`405`).
- JSON payloads are validated with content-type and max body size checks.
- JSON responses include no-store and browser hardening headers.
- Readonly mode can be enabled with:

```bash
ONEDB_READONLY=1
```

When enabled, non-read SQL statements are blocked by the runtime.

Useful hardening env flags:

```bash
# Comma-separated CORS origin allowlist
ONEDB_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Max accepted JSON request body (bytes)
ONEDB_MAX_BODY_BYTES=2097152
```

## Repository Notes

This repository keeps development sources (`frontend` + `backend`) and the generated release artifact (`release/OneDB.php`) together so it can support both iterative development and single-file distribution.
