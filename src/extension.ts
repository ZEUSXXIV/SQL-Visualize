import * as vscode from 'vscode';
import { Parser } from 'node-sql-parser';
import * as sql from 'mssql';

function generateSqlFromGraph(nodes: any[], edges: any[], targetNodeId?: string): string {
    let finalOutput = '';

    if (nodes.length === 0) return '';

    // 1. Build Adjacency List for Connected Components
    const adj: Record<string, string[]> = {};
    nodes.forEach((n: any) => adj[n.id] = []);
    edges.forEach((e: any) => {
        if(adj[e.source]) adj[e.source].push(e.target);
        if(adj[e.target]) adj[e.target].push(e.source);
    });

    // 2. Discover Connected Components
    const visited = new Set<string>();
    const components: any[][] = [];
    nodes.forEach((n: any) => {
        if (!visited.has(n.id)) {
            const compNodes: any[] = [];
            const queue = [n.id];
            visited.add(n.id);
            while (queue.length > 0) {
                const curr = queue.shift()!;
                compNodes.push(nodes.find((x: any) => x.id === curr));
                adj[curr].forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                });
            }
            components.push(compNodes);
        }
    });

    // 3. Generate SQL for specific component (if targetNodeId provided) or all
    const targetComponents = targetNodeId 
        ? components.filter(comp => comp.some(n => n.id === targetNodeId))
        : components;

    targetComponents.forEach((compNodes, idx) => {
        let selectColumns: string[] = [];
        let whereClauses: string[] = [];

        // Track column name occurrences to handle duplicates
        const colMetadata: any[] = [];
        const counters: Record<string, number> = {};

        compNodes.forEach((node: any) => {
            const tableReference = node.data.tableAlias || node.data.tableName;
            node.data.columns.forEach((col: any) => {
                if (col.isSelected !== false) {
                    const targetName = col.alias || col.name;
                    counters[targetName] = (counters[targetName] || 0) + 1;
                    colMetadata.push({ node, col, targetName, tableReference });
                }

                // Process filters
                if (col.filter && col.filter.operator) {
                    const op = col.filter.operator;
                    if (op === 'IS NULL' || op === 'IS NOT NULL') {
                        whereClauses.push(`${tableReference}.${col.name} ${op}`);
                    } else if (col.filter.value && col.filter.value.trim() !== '') {
                        let val = col.filter.value.trim();
                        // Smart Quotes auto-wrapping
                        if (op !== 'IN') {
                             const needsQuotes = /char|text|date|time|uniqueidentifier/i.test(col.type);
                             if (needsQuotes && !val.startsWith("'")) {
                                 val = `'${val}'`;
                             }
                        }
                        whereClauses.push(`${tableReference}.${col.name} ${op} ${val}`);
                    }
                }
            });
        });

        // Generate actual SELECT strings
        colMetadata.forEach(meta => {
            let colStr = `${meta.tableReference}.${meta.col.name}`;
            if (meta.col.function && meta.col.function !== '') colStr = `${meta.col.function}(${colStr})`;
            
            if (counters[meta.targetName] > 1) {
                const cleanTableName = meta.tableReference.replace(/\[|\]/g, '');
                const finalAlias = meta.col.alias || meta.col.name;
                colStr += ` AS [${cleanTableName}.${finalAlias}]`;
            } else if (meta.col.alias && meta.col.alias !== '') {
                colStr += ` AS [${meta.col.alias}]`;
            }
            selectColumns.push(colStr);
        });

        const root = compNodes[0];
        let fromTable = root.data.tableAlias ? `${root.data.tableName} AS ${root.data.tableAlias}` : root.data.tableName;
        let joins: string[] = [];
        
        if (compNodes.length > 1) {
            const joinedSet = new Set<string>();
            joinedSet.add(root.id);
            
            const compNodeIds = new Set(compNodes.map(n => n.id));
            const compEdges = edges.filter((e: any) => compNodeIds.has(e.source) && compNodeIds.has(e.target));
            
            let remainingEdges = [...compEdges];
            while (remainingEdges.length > 0) {
                const edgeIdx = remainingEdges.findIndex(e => 
                    (joinedSet.has(e.source) && !joinedSet.has(e.target)) ||
                    (joinedSet.has(e.target) && !joinedSet.has(e.source))
                );
                
                if (edgeIdx === -1) {
                    remainingEdges.forEach(e => {
                        const s = nodes.find((n: any) => n.id === e.source);
                        const t = nodes.find((n: any) => n.id === e.target);
                        const sTable = s.data.tableAlias || s.data.tableName;
                        const tTableDef = t.data.tableAlias ? `${t.data.tableName} AS ${t.data.tableAlias}` : t.data.tableName;
                        const tTable = t.data.tableAlias || t.data.tableName;
                        const sCol = e.sourceHandle.replace('out-', '');
                        const tCol = e.targetHandle.replace('in-', '');
                        const jType = e.data?.joinType || 'INNER';
                        joins.push(`${jType} JOIN ${tTableDef} ON ${sTable}.${sCol} = ${tTable}.${tCol}`);
                    });
                    break;
                }
                
                const e = remainingEdges[edgeIdx];
                remainingEdges.splice(edgeIdx, 1);
                
                const targetId = joinedSet.has(e.source) ? e.target : e.source;
                joinedSet.add(targetId);
                
                const sNode = nodes.find((n: any) => n.id === e.source);
                const tNode = nodes.find((n: any) => n.id === e.target);
                const sTable = sNode.data.tableAlias || sNode.data.tableName;
                const tTable = tNode.data.tableAlias || tNode.data.tableName;
                const sCol = e.sourceHandle.replace('out-', '');
                const tCol = e.targetHandle.replace('in-', '');
                
                const enteringNode = targetId === e.source ? sNode : tNode;
                const enteringTableDef = enteringNode.data.tableAlias ? `${enteringNode.data.tableName} AS ${enteringNode.data.tableAlias}` : enteringNode.data.tableName;
                const joinType = e.data?.joinType || 'INNER';
                
                joins.push(`${joinType} JOIN ${enteringTableDef} ON ${sTable}.${sCol} = ${tTable}.${tCol}`);
            }
        }

        let rawSql = `SELECT ${selectColumns.length > 0 ? selectColumns.join(', ') : '*'} FROM ${fromTable} ${joins.join(' ')}`;
        
        if (whereClauses.length > 0) {
            rawSql += `\nWHERE ${whereClauses.join(' AND ')}`;
        }
        
        const hasAgg = selectColumns.some(c => c.match(/(COUNT|SUM|MAX|MIN|AVG)\(/i));
        if (hasAgg) {
            const nonAgg = selectColumns.filter(c => !c.match(/(COUNT|SUM|MAX|MIN|AVG)\(/i)).map(c => c.split(' AS ')[0]);
            if (nonAgg.length > 0) rawSql += `\nGROUP BY ${nonAgg.join(', ')}`;
        }

        finalOutput += `-- Query Batch ${idx + 1} (${compNodes.map(n => n.data.tableName).join(', ')})\n${rawSql}\n\n`;
    });

    return finalOutput.trim();
}

export function activate(context: vscode.ExtensionContext) {
    const mssqlExtension = vscode.extensions.getExtension('ms-mssql.mssql');
    if (!mssqlExtension) {
        vscode.window.showWarningMessage('ms-mssql.mssql extension not found. Running SQL Visualize in MVP Simulation mode.');
    }

    console.log('SQL Visualize is now active!');
    
    let dbPool: sql.ConnectionPool | null = null;

    let disposable = vscode.commands.registerCommand('mssql-visual-builder.open', () => {
        const panel = vscode.window.createWebviewPanel(
            'mssqlVisualBuilder',
            'SQL Visualize',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')]
            }
        );

        const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js'));
        panel.webview.html = getWebviewContent(scriptUri);

        // Introspection / PostMessage Pipeline
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'CONNECT_DB':
                        const connectionString = message.payload;
                        try {
                            if (dbPool) {
                                await dbPool.close();
                            }
                            dbPool = new sql.ConnectionPool(connectionString);
                            await dbPool.connect();
                            vscode.window.showInformationMessage('Successfully connected to Database via SQL Visualize!');
                            panel.webview.postMessage({ command: 'CONNECTION_SUCCESS' });
                        } catch (err: any) {
                            vscode.window.showErrorMessage(`Failed to connect to Database: ${err.message}`);
                            panel.webview.postMessage({ command: 'CONNECTION_ERROR', payload: err.message });
                        }
                        return;

                    case 'REQUEST_TABLES':
                        if (!dbPool) {
                            vscode.window.showErrorMessage('No active database connection mapped!');
                            return;
                        }
                        try {
                            const result = await dbPool.request().query(`
                                SELECT 
                                    t.name AS tableName,
                                    c.name AS columnName,
                                    ty.name AS dataType,
                                    s.name AS schemaName
                                FROM 
                                    sys.tables t
                                INNER JOIN 
                                    sys.columns c ON t.object_id = c.object_id
                                INNER JOIN 
                                    sys.types ty ON c.user_type_id = ty.user_type_id
                                INNER JOIN 
                                    sys.schemas s ON t.schema_id = s.schema_id
                                ORDER BY 
                                    schemaName, 
                                    tableName, 
                                    c.column_id;
                            `);
                            
                            const tablesMap: Record<string, any> = {};
                            result.recordset.forEach((row: any) => {
                                const key = `[${row.schemaName}].[${row.tableName}]`;
                                if (!tablesMap[key]) {
                                    tablesMap[key] = { tableName: key, columns: [] };
                                }
                                tablesMap[key].columns.push({ name: `${row.columnName}`, type: row.dataType });
                            });
                            
                            const tablesArray = Object.values(tablesMap);
                            panel.webview.postMessage({ command: 'TABLE_DATA', payload: tablesArray });
                        } catch(err: any) {
                            vscode.window.showErrorMessage(`Schema Fetch Error: ${err.message}`);
                        }
                        return;
                    case 'PREVIEW_TABLE':
                        if (!dbPool) {
                            vscode.window.showErrorMessage('SQL Visualize: Database not connected. Cannot preview data.');
                            return;
                        }
                        vscode.window.showInformationMessage(`Visualizing TOP 25 records from [${message.table}]...`);
                        try {
                            const result = await dbPool.request().query(`SELECT TOP 25 * FROM ${message.table}`);
                            panel.webview.postMessage({ command: 'PREVIEW_DATA', table: message.table, data: result.recordset });
                        } catch(err: any) {
                            vscode.window.showErrorMessage(`Preview Error: ${err.message}`);
                        }
                        return;
                        return;
                    case 'EXECUTE_VISUAL_QUERY':
                        if (!dbPool) {
                            vscode.window.showErrorMessage('SQL Visualize: Database not connected.');
                            return;
                        }
                        try {
                            const sql = generateSqlFromGraph(message.payload.nodes, message.payload.edges);
                            vscode.window.showInformationMessage('SQL Visualize: Executing visual query...');
                            const result = await dbPool.request().query(sql);
                            panel.webview.postMessage({ 
                                command: 'QUERY_RESULTS', 
                                data: result.recordset,
                                rowsAffected: result.rowsAffected[0]
                            });
                        } catch(err: any) {
                            panel.webview.postMessage({ 
                                command: 'QUERY_ERROR', 
                                message: err.message 
                            });
                            vscode.window.showErrorMessage(`Execution Error: ${err.message}`);
                        }
                        return;
                    case 'SAVE_WORKSPACE':
                        const saveUri = await vscode.window.showSaveDialog({
                            filters: { 'SQL Visualize Config': ['sqlviz'] },
                            title: 'Save Workspace As',
                            defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath + '/query.sqlviz' : 'query.sqlviz')
                        });
                        if (saveUri) {
                            const payload = JSON.stringify(message.payload, null, 2);
                            const writeData = new TextEncoder().encode(payload);
                            await vscode.workspace.fs.writeFile(saveUri, writeData);
                            vscode.window.showInformationMessage('SQL Visualize: Workspace saved successfully!');
                        }
                        return;
                    case 'LOAD_WORKSPACE':
                        const openUris = await vscode.window.showOpenDialog({
                            canSelectMany: false,
                            filters: { 'SQL Visualize Config': ['sqlviz'] },
                            title: 'Load SQL Visualize Workspace'
                        });
                        if (openUris && openUris[0]) {
                            try {
                                const fileData = await vscode.workspace.fs.readFile(openUris[0]);
                                const payload = JSON.parse(Buffer.from(fileData).toString('utf8'));
                                panel.webview.postMessage({ command: 'WORKSPACE_LOADED', payload });
                            } catch (err: any) {
                                vscode.window.showErrorMessage(`SQL Visualize: Failed to load workspace: ${err.message}`);
                            }
                        }
                        return;
                    case 'GENERATE_SQL':
                        const sqlOutput = generateSqlFromGraph(message.payload.nodes, message.payload.edges);
                        vscode.workspace.openTextDocument({ language: 'sql', content: sqlOutput }).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                        return;
                    case 'EXECUTE_VISUAL_BATCH':
                        if (!dbPool) {
                            vscode.window.showErrorMessage('SQL Visualize: Database not connected.');
                            return;
                        }
                        try {
                            const sql = generateSqlFromGraph(message.payload.nodes, message.payload.edges, message.payload.targetNodeId);
                            vscode.window.showInformationMessage(`SQL Visualize: Executing batch for [${message.payload.targetNodeId}]...`);
                            const result = await dbPool.request().query(sql);
                            panel.webview.postMessage({ 
                                command: 'QUERY_RESULTS', 
                                data: result.recordset,
                                rowsAffected: result.rowsAffected[0]
                            });
                        } catch(err: any) {
                            panel.webview.postMessage({ 
                                command: 'QUERY_ERROR', 
                                message: err.message 
                            });
                            vscode.window.showErrorMessage(`Batch Execution Error: ${err.message}`);
                        }
                        return;
                    case 'GENERATE_BATCH_SQL':
                        const batchSql = generateSqlFromGraph(message.payload.nodes, message.payload.edges, message.payload.targetNodeId);
                        vscode.workspace.openTextDocument({ language: 'sql', content: batchSql }).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(scriptUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Query Builder</title>
</head>
<body style="padding: 0; margin: 0; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground);">
    <div id="root" style="width: 100vw; height: 100vh;"></div>
    <script>
        const vscode = acquireVsCodeApi();
        window.vscodeApi = vscode;
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
