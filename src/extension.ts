import * as vscode from 'vscode';
import { Parser } from 'node-sql-parser';
import * as sql from 'mssql';

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
                    case 'GENERATE_SQL':
                        const { nodes, edges } = message.payload;
                        let finalOutput = '';

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

                        // 3. Generate SQL for each isolated graph component
                        components.forEach((compNodes, idx) => {
                            let selectColumns: string[] = [];
                            compNodes.forEach((node: any) => {
                                const table = node.data.tableName;
                                node.data.columns.forEach((col: any) => {
                                    if (col.isSelected !== false) {
                                        let colStr = `${table}.${col.name}`;
                                        if (col.function && col.function !== '') colStr = `${col.function}(${colStr})`;
                                        if (col.alias && col.alias !== '') colStr += ` AS ${col.alias}`;
                                        selectColumns.push(colStr);
                                    }
                                });
                            });

                            const root = compNodes[0];
                            let fromTable = root.data.tableName;
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
                                        // Resolution fallback for cyclic graphs or disjoint sub-edges
                                        remainingEdges.forEach(e => {
                                            const s = nodes.find((n: any) => n.id === e.source);
                                            const t = nodes.find((n: any) => n.id === e.target);
                                            const sCol = e.sourceHandle.replace('out-', '');
                                            const tCol = e.targetHandle.replace('in-', '');
                                            const jType = e.data?.joinType || 'INNER';
                                            joins.push(`${jType} JOIN ${t.data.tableName} ON ${s.data.tableName}.${sCol} = ${t.data.tableName}.${tCol}`);
                                        });
                                        break;
                                    }
                                    
                                    const e = remainingEdges[edgeIdx];
                                    remainingEdges.splice(edgeIdx, 1);
                                    
                                    const targetId = joinedSet.has(e.source) ? e.target : e.source;
                                    joinedSet.add(targetId);
                                    
                                    const sNode = nodes.find((n: any) => n.id === e.source);
                                    const tNode = nodes.find((n: any) => n.id === e.target);
                                    const sTable = sNode.data.tableName;
                                    const tTable = tNode.data.tableName;
                                    const sCol = e.sourceHandle.replace('out-', '');
                                    const tCol = e.targetHandle.replace('in-', '');
                                    
                                    const enteringTable = targetId === e.source ? sTable : tTable;
                                    const joinType = e.data?.joinType || 'INNER';
                                    
                                    joins.push(`${joinType} JOIN ${enteringTable} ON ${sTable}.${sCol} = ${tTable}.${tCol}`);
                                }
                            }

                            let rawSql = `SELECT ${selectColumns.join(', ')} FROM ${fromTable} ${joins.join(' ')}`;
                            let parsedSql = rawSql;
                            try {
                                const parser = new Parser();
                                const ast = parser.astify(rawSql);
                                parsedSql = parser.sqlify(ast, { database: 'transactsql' });
                            } catch(e) {
                                parsedSql = rawSql + '\\n-- (AST Generation fallback)';
                            }

                            const hasAgg = selectColumns.some(c => c.match(/(COUNT|SUM|MAX|MIN|AVG)\(/));
                            if (hasAgg) {
                                const nonAgg = selectColumns.filter(c => !c.match(/(COUNT|SUM|MAX|MIN|AVG)\(/)).map(c => c.split(' AS ')[0]);
                                if (nonAgg.length > 0) parsedSql += `\nGROUP BY ${nonAgg.join(', ')}`;
                            }

                            finalOutput += `-- Query Batch ${idx + 1} (${compNodes.map(n => n.data.tableName).join(', ')})\n${parsedSql}\n\n`;
                        });

                        vscode.workspace.openTextDocument({ language: 'sql', content: finalOutput.trim() }).then(doc => {
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
