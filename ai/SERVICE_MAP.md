# OneDB Service Map

This document maps the business logic providers (Services) in the backend and the orchestration logic (Hooks/View-Models) in the frontend.

## 🐘 Backend Services (PHP)

Core services are organized under the `OneDB\Database` namespace.

### 1. `MetadataService` (`MetadataService.php`)
Introspects database structures and fetches schema information.
- `listDatabases(array $connection)`: Returns list of accessible databases.
- `listTables(array $connection)`: Returns all tables and views in the current schema.
- `browseTable(array $payload)`: High-performance data fetching with filters, sorting, and pagination.

### 2. `QueryService` (`QueryService.php`)
Handles raw SQL execution and results formatting.
- `execute(array $connection, string $sql)`: Executes a single statement.
- `executeTransactionBatch(array $connection, array $statements)`: atomicity-guaranteed execution of multiple statements.

### 3. `ConnectionFactory` (`ConnectionFactory.php`)
- `makePdo(array $connection)`: Returns a pre-configured PDO instance based on driver type (MySQL, PgSQL, SQLite).

---

## ⚛️ Frontend Logic Hooks (React)

Logic is split into Data Access (API) and UI State (View-Models).

### 1. Data Access Hub
- **`useOneDbApi`**: Centralized hook for all backend communication. Handles CSRF tokens, shared error handling, and loading states.

### 2. View-Model Controllers
Located in `frontend/src/hooks/workspace/view-models/`. These manage the state of specific UI blocks.

- **`useWorkspaceViewModel`**: Global workspace state (current connection, active DB).
- **`useWorkspaceMainPanelViewModel`**: Manages table tabs, active table data, and view switching.
- **`useDatabaseManagerWorkspaceActionsModel`**: Orchestrates sidebars and root-level workspace events.
- **`useDatabaseManagerLoginModel`**: Manages connection profile lifecycle and authentication states.

### 3. Action Providers
Located in `frontend/src/hooks/workspace/actions/`.
- **`useWorkspaceSqlActions`**: Logic for SQL formatting, history management, and query execution.
