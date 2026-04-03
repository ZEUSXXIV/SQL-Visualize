# Visual Query Builder Implementation Plan

This document outlines the step-by-step process for building the MSSQL Visual Query Builder extension. 

## User Review Required
> [!IMPORTANT]
> Please review this phase breakdown. I have already scaffolded the `package.json` file. Once you approve this plan, I will begin executing the bash commands (`npm install`, etc) and create the underlying source code for Phase 1.

## Proposed Changes

### Phase 1: Foundation
- Finish scaffolding the VS Code extension structure (`tsconfig.json`, `webpack.config.js`).
- Complete NPM dependencies installation (`@vscode/webview-ui-toolkit`, `react`, `reactflow`, `node-sql-parser`).
- Set up base `src/extension.ts` ensuring it requires `ms-mssql.mssql`.
- Create a build script strategy for compiling React JSX down to a bundled Webview script.

### Phase 2: Canvas / UI
- Setup `WebviewPanel` registration in `extension.ts` (HTML string generation).
- Create basic React entry-point that mounts inside the Webview.
- Configure `React Flow` for infinite canvas and interaction.
- Create UI elements using `@vscode/webview-ui-toolkit` matching native VS Code styles.
- Create custom React Flow node components displaying SQL Table signatures.
- Implement custom React Flow `Edge` components that render properties for JOIN configurations, including interactive Venn diagrams previewing the selected JOIN type (INNER, LEFT, etc).
- Enforce strict schema-level data type compatibility for JOINs via React Flow's `isValidConnection` hook. Invalid connections will prevent the edge creation and flash a visual warning.
- Implement inline UI controls (e.g., dropdowns/context menus) on columns to apply predefined SQL functions (`MAX`, `MIN`, `COUNT`, `SUM`, `AVG`, etc.) and set aliases.

### Phase 3: Database Introspection
- Integrate data pipelines to fetch Schema metadata (tables, columns, datatypes) using the `ms-mssql` API or raw queries.
- Build the bi-directional `postMessage` passing interface (as per `architecture.md`).

### Phase 4: SQL Generation
- Create serialization logic converting `React Flow` Nodes (Tables) and Edges (inclusive of the specified JOIN types) into normalized JSON graphs.
- Implement AST generation using `node-sql-parser`, expanding it to parse predefined functions applied to columns.
- Support auto-grouping heuristics to add `GROUP BY` and `HAVING` clauses when aggregate functions are mixed with standard column selections.
- Handle specific output target formats cleanly emitting syntactically valid T-SQL.
- Create the side panel/split pane preview inside the webview or opening a new VS Code `TextDocument`.

## Open Questions
- Do we want to auto-layout the tables when they are added to the canvas via algorithms like `Dagre`, or leave it strictly up to user manual placement?
- Would you like `node-sql-parser` to generate the SQL string directly or would you prefer a custom string builder since T-SQL has specific nuances (e.g., `[]` identifiers)?

## Verification Plan

### Automated Tests
- Unit testing AST object conversion to ensure output string matches expected T-SQL queries.

### Manual Verification
- Start the Visual Builder via the Extension Development Host.
- Verify user layout features work smoothly within the Webview inside VS Code.
- Pass dummy node structure to graph builder and check the accuracy of compiled SQL.
