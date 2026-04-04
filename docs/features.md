# 📚 SQL Visualize: Feature Documentation

This document provides a comprehensive breakdown of every feature, interaction, and technical safeguard present in the **SQL Visualize** extension.

---

## 1. 📂 Object Explorer (Sidebar)
The starting point for query building. Features a high-density, hierarchical tree view.

- **Schema Grouping**: Tables are automatically grouped by SQL Schema (e.g., `[dbo]`, `[Sales]`) to simplify navigation in large databases.
- **Search with Auto-Expand**: Typing in the search bar filters tables and instantly expands any schema folder containing a match.
- **Hierarchical Peeking**: Every table can be expanded to view its column names and data types without adding it to the canvas.
- **Quick Data Preview (Ghost Eye)**: A hover-triggered "Eye" icon that executes a `TOP 25` query and displays results instantly in the tray.
- **Collapse All**: A one-click reset for the tree structure.
- **Refresh Schema**: Manually re-fetches metadata from the connected SQL Server.

---

## 2. 🏗️ Visual Canvas (React Flow)
An infinite-zoom workspace for query structure experimentation.

- **Drag & Drop**: Seamless transfer of table definitions from the explorer to the canvas.
- **Smart Alignment**: Nodes snap to a grid for a clean architectural layout.
- **Spatial Grouping**: Disconnected groups of tables (islands) are automatically recognized as separate query batches.
- **Target Node Execution**: Right-clicking or selecting a node allows the user to generate/run SQL only for the component connected to that specific node.
- **Persistent State**: The entire canvas layout (positions, joins, selections) can be saved to a `.sqlviz` file.

---

## 3. 📊 Table Nodes
Interactive data definitions that drive code generation.

- **Column Selection**: Checkboxes to toggle `SELECT` inclusion in real-time.
- **Inline Aliasing**: Users can alias any column via a dedicated input field.
- **Filter Engine (WHERE)**: Supports operators like `=`, `>`, `<`, `LIKE`, `IN`, `IS NULL`, and `IS NOT NULL`.
- **Aggregate Integration**: Dropdown menu on each column to apply `SUM`, `AVG`, `MIN`, `MAX`, or `COUNT`.
- **Table Alias**: Global alias support per node (e.g., `Users AS u`).
- **Interactive Cleanup**: Quick "✕" button to remove a table and its associated joins from the workspace.

---

## 4. 🧠 Intelligent Join Suggester
A proactive relational copilot.

- **Ghost Joins**: Dashed blue lines that appear automatically when tables with Foreign Key relationships are added to the canvas.
- **Accept/Ignore Interaction**: Suggested joins do not impact SQL output until the "Accept" button is clicked.
- **Metadata-Driven**: Powered by a background crawl of `sys.foreign_keys`.
- **Auto-Cleanup**: Suggested joins are automatically removed if either table is deleted.

---

## 5. 🎨 Visual Join Editor
Premium Venn-diagram-based join configuration.

- **SVG Venn Interface**: A visual representation of `INNER`, `LEFT`, `RIGHT`, and `FULL` outer joins.
- **Hover Highlighting**: Different segments of the Venn diagram light up to explain the logical set operations.
- **Pop-over Management**: A clean, overlay-based UI that keeps the canvas uncluttered.
- **Interactive Toggles**: Large, accessible buttons to switch join types with instant SQL preview updates.

---

## 6. 📜 SQL Generation Engine
The robust "Visual Compiler" of the extension.

- **Multivariate Join Support**: Correctly generates T-SQL for all 4 major join types.
- **Batch Processing**: Automatically adds `-- Query Batch X` headers between disconnected islands.
- **Cycle Handling**: Robust logic to prevent infinite recursion in circular joins (e.g., A-B-C-A).
- **Aggregate Auto-Grouping**: Seamlessly injects `GROUP BY` clauses only when a mix of non-aggregated and aggregated columns is detected.
- **Collision Detection**: Automatically aliases columns with identical names from different tables (e.g., `Users.Id AS [Users.Id]`).
- **SQL Preview Pane**: Real-time syntax-highlighted T-SQL preview window.

---

## 7. 📥 Results Tray
Advanced data exploration interface.

- **Tabbed Results**: Supports multiple result sets from batch executions.
- **Absolute-Inset Scrolling**: Custom CSS pattern ensuring both horizontal and vertical scrolling work reliably, regardless of flex layout constraints.
- **Tab Management**: Ability to rename or close results tabs.
- **Execution Performance**: Displays record counts and success/error states for every execution.

---

## 8. 🛡️ Hardening & Reliability
- **56-Case Regression Suite**: A massive unit test library in `SqlGenerator.test.ts` ensuring core logic never breaks during UI changes.
- **Error Boundaries**: Prevents app crashes if a malformed `.sqlviz` file is loaded.
- **Type Safety**: Fully typed TypeScript architecture for both extension and webview.
