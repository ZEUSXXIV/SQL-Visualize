# Architecture: Visual Query Builder

## Overview
The extension uses a bifurcated architecture standard to rich VS Code extensions:
1. **Extension Host** (Node.js)
2. **Webview UI** (React + React Flow)

The UI renders the visual canvas, while the Extension Host interacts with VS Code's API and the `ms-mssql` extension.

## 1. Extension Host (Node.js)
- **Activator / Controller**: Registers commands (`mssql-visual-builder.open`).
- **Data Provider**: Interacts with `ms-mssql.mssql` extensibility API or runs SQL scripts directly to retrieve schema information (tables, columns, foreign keys).
- **Message Broker**: Uses `webview.webview.postMessage` and listens to `webview.webview.onDidReceiveMessage` to ferry data back and forth.

## 2. Webview (React Flow + Webview UI Toolkit)
- **State Management**: React state handles nodes (tables) and edges (JOINs).
- **UI Components**: Built with `@vscode/webview-ui-toolkit/react` for a native IDE look and feel.
- **Visual Nodes**: Custom React Flow node types representing SQL Database Tables.

## 3. Message Passing Interface
### Host -> Webview
- `INIT_CANVAS`: Send initial schema data or saved state.
- `TABLE_DATA`: Send newly requested table schema updates.
- `THEME_CHANGE`: Notify about VS code theme changes to update the canvas colors properly to respect current user themes.

### Webview -> Host
- `REQUEST_TABLE`: Ask host to fetch schema for a specific table.
- `GENERATE_SQL`: Send the current Node/Edge graph to the Host to be translated into T-SQL.
- `OPEN_EDITOR`: Ask Host to open a new VS Code text document with the generated SQL.

## 4. SQL Generation Pipeline
`[React Graph State]` -> `[JSON Representation]` -> `[Host AST Parser (node-sql-parser)]` -> `[T-SQL Output]`
