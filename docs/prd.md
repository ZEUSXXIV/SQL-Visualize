# Product Requirements Document: Visual Query Builder

## 1. Overview
The Visual Query Builder is a companion VS Code extension to the official Microsoft `ms-mssql.mssql` extension. It provides a visual canvas for users to build complex T-SQL queries by dragging and dropping database tables, defining relationships via connections, and visually selecting columns to build JOINs and filters.

## 2. Goals
- Provide a responsive Webview canvas to interactively build SQL.
- Allow users to drag tables onto the canvas.
- Visualize foreign keys and explicit JOIN relationships visually via connecting lines.
- Generate valid T-SQL dynamically from the canvas state.

## 3. Core Features
- **Integration**: Depends on `ms-mssql.mssql` to introspect database schema.
- **Canvas View**: A React Flow based infinite canvas.
- **Table Nodes**: Display table name and columns.
- **Predefined Functions**: Native Canvas options to apply standard T-SQL functions to selected columns: Aggregations (`MAX`, `MIN`, `COUNT`, `SUM`, `AVG`), String manipulation (`UPPER`, `LOWER`, `CONCAT`), Math logic, and Date processing.
- **Grouping & Aliasing**: Visual UI controls allowing column aliasing (`AS alias_name`) and dynamic query modifiers (`GROUP BY`, `HAVING`) triggered automatically when aggregations are applied.
- **Dynamic JOINs**: Users can draw edges connecting tables. Selecting an edge allows configuring the JOIN type (INNER, LEFT, RIGHT, FULL OUTER). A visual preview (e.g., Venn diagram or data illustration) demonstrates the effect of the selected JOIN in real-time. The canvas strictly enforces type safety, preventing users from creating JOIN edges between logically incompatible Data Types (e.g., `INT` cannot join with `UNIQUEIDENTIFIER`).
- **AST -> SQL Engine**: Transform the visual representation into AST and compile it to formatted T-SQL.

## 4. User Flow
1. User right-clicks a database or table in the MSSQL extension or uses a command palette command.
2. The "Visual Query Builder" webview opens.
3. User adds tables to the webview.
4. User selects columns to include in the SELECT statement, optionally applying predefined functions (e.g. `MAX()`, `COUNT()`) or aliases as needed.
5. User draws lines to establish JOINs, and can click the line to choose the JOIN type and view an example result preview.
6. The compiled T-SQL is previewed in real-time or exportable to a new SQL editor file.
