# OneDB Component Map

This registry lists all significant React components in the OneDB frontend, categorized by their domain and responsibility.

## 🏗️ Core Layout
| Component | Responsibility | Location |
| :--- | :--- | :--- |
| `DatabaseManager` | Root application container & controller. | `DatabaseManager.jsx` |
| `WorkspaceLayout` | Handles the shell (Sidebar + Main Panel). | `workspace/WorkspaceLayout.jsx` |
| `WorkspaceHeaderBar` | Top navigation, database selector, and user actions. | `workspace/WorkspaceHeaderBar.jsx` |
| `WorkspaceStatusBar` | Displays connection info, ping, and version. | `workspace/WorkspaceStatusBar.jsx` |

## 🧭 Workspace Panels
| Component | Responsibility | Location |
| :--- | :--- | :--- |
| `AppSidebar` | Database/Table tree, favorites, and search. | `workspace/AppSidebar.jsx` |
| `TableTabsToolbar` | Tabbed interface for browsing multiple tables. | `workspace/TableTabsToolbar.jsx` |
| `TableBrowserView` | Core data grid with pagination, filters, and editing. | `workspace/TableBrowserView.jsx` |
| `SqlEditorView` | SQL writing interface with CodeMirror integration. | `workspace/SqlEditorView.jsx` |
| `SchemaView` | Metadata inspection, routine lists, and FK graphs. | `workspace/SchemaView.jsx` |
| `DatabaseOverview` | Dashboard-style metrics and general DB tools. | `workspace/DatabaseOverview.jsx` |

## 🛠️ Modals & Overlays
| Component | Responsibility | Location |
| :--- | :--- | :--- |
| `DatabaseActionModals` | Handles Create DB, Create Table, Import/Export. | `modals/DatabaseActionModals.jsx` |
| `SettingsModal` | Workspace preferences and theme selection. | `modals/SettingsModal.jsx` |
| `JsonViewerModal` | Advanced viewer for JSON and large text fields. | `modals/JsonViewerModal.jsx` |
| `RowFormDrawer` | Detailed record editing and creation interface. | `modals/RowFormDrawer.jsx` |
| `CommandPalette` | Quick-search and keyboard-driven navigation. | `workspace/CommandPalette.jsx` |

## 📦 Shared Components
- `SearchableSelectField`: Custom dropdown with filtering.
- `ToggleSwitch`: Premium UI toggle with animations.
- `WorkspaceContextMenus`: Handle right-click actions on nodes.

## 🔌 Component Communication
Components are generally "fat" in terms of logic but delegate to **View-Model Hooks** to maintain separation of concerns.
Example: `TableBrowserView` communicates with `useWorkspaceMainPanelViewModel`.
