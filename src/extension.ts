import * as vscode from 'vscode';
import * as sql from 'mssql';
import { SqlGenerator } from './core/SqlGenerator';

function generateSqlFromGraph(nodes: any[], edges: any[], targetNodeId?: string): string {
    return SqlGenerator.generateSqlFromGraph(nodes, edges, targetNodeId);
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
