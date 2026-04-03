# 🛰️ SQL Visualize
### *Visual T-SQL Query Designer for VS Code*

**SQL Visualize** transforms the way you write T-SQL queries. Instead of wrestling with complex JOIN syntax and aggregate grouping, simply drag, drop, and connect.

---

## 🚀 Experience the Flow

SQL Visualize provides a high-performance, interactive canvas for database schema exploration and query generation.

- **🎨 Intuitive Canvas**: Powered by React Flow for a smooth, pan-and-zoom infinite workspace.
- **🔗 Smart Joins**: Draw connections between columns. SQL Visualize automatically identifies compatible data types and handles the JOIN logic.
- **📊 Real-time Aggregation**: Apply `MAX`, `MIN`, `COUNT`, `SUM`, and `AVG` directly on column nodes. 
- **🛡️ Type Safety**: Active guarding prevents incompatible column joins (e.g., joining `INT` to `DATETIME`).
- **📦 Multi-Query Batching**: Isolated table clusters on your canvas are automatically generated as separate, valid T-SQL batches.
- **✨ Auto-Grouping**: SQL Visualize automatically calculates and injects `GROUP BY` clauses when aggregate functions are detected.

---

## 🛠️ Tech Stack

- **Core**: VS Code Extension API (TypeScript)
- **Frontend**: React + React Flow
- **Styling**: VS Code Webview UI Toolkit (Native Look & Feel)
- **Engine**: Node SQL Parser (AST-based generation)

---

## 🛠️ Getting Started

### Installation
1. Search for **SQL Visualize** in the VS Code Extension Marketplace.

### Usage
1. Open the Command Palette (**Ctrl+Shift+P**).
2. Type `SQL Visualize: Open Canvas`.
3. **Important**: Follow the [SQL Server Setup Guide](file:///c:/Users/Naveen/Documents/projects/mssql-visual-builder/docs/sql-server-setup.md) to enable TCP/IP and SQL Authentication on your local server.
4. Provide your connection string (e.g., `Server=localhost;Database=master;User Id=sa;Password=...;Encrypt=True;TrustServerCertificate=True;`).
5. Click **Connect Engine** to load your schema into the Object Explorer Sidebar.
6. Drag tables onto the canvas and start building!

---

## 🔧 Developer Setup

If you want to contribute to the engine:

```bash
# Clone and install
git clone https://github.com/your-username/sql-visualize.git
npm install

# Build extension and webview
npm run compile

# Launch
# Press F5 in VS Code to start the Extension Development Host
```

---

## 📄 License
MIT License. Created by Naveen.
