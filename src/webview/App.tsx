import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, { addEdge, Background, Controls, Node, Edge, Connection, useNodesState, useEdgesState, ReactFlowProvider } from 'reactflow';
import { TableNode } from './components/TableNode';
import { JoinEdge } from './components/JoinEdge';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import 'reactflow/dist/style.css';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { joinEdge: JoinEdge };

declare global {
    interface Window {
        vscodeApi: {
            postMessage: (message: any) => void;
        };
    }
}

let idGen = 0;
const getId = () => `dndnode_${idGen++}`;

export const App = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [dbSchema, setDbSchema] = useState<any[]>([]);
    const [previewData, setPreviewData] = useState<{ table: string, records: any[] } | null>(null);
    const [queryResults, setQueryResults] = useState<{ data: any[], rowsAffected: number } | null>(null);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [validationTrigger, setValidationTrigger] = useState(0);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'CONNECTION_SUCCESS':
                    setIsConnected(true);
                    setIsConnecting(false);
                    // Automatically rip the database tables into the Sidebar
                    // @ts-ignore
                    if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'REQUEST_TABLES' });
                    break;
                case 'CONNECTION_ERROR':
                    setIsConnected(false);
                    setIsConnecting(false);
                    break;
                case 'TABLE_DATA':
                    setDbSchema(message.payload);
                    break;
                case 'PREVIEW_DATA':
                    setPreviewData({ table: message.table, records: message.data });
                    setQueryResults(null);
                    setQueryError(null);
                    break;
                case 'QUERY_RESULTS':
                    setQueryResults({ data: message.data, rowsAffected: message.rowsAffected });
                    setPreviewData(null);
                    setQueryError(null);
                    break;
                case 'QUERY_ERROR':
                    setQueryError(message.message);
                    setQueryResults(null);
                    setPreviewData(null);
                    break;
                case 'WORKSPACE_LOADED':
                    const loadedNodes = message.payload.nodes || [];
                    const loadedEdges = message.payload.edges || [];
                    setNodes(loadedNodes);
                    setEdges(loadedEdges);
                    setValidationTrigger(v => v + 1);
                    break;
            }
        };
        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, [setNodes, setEdges]);

    useEffect(() => {
        if (!isConnected && dbSchema.length === 0) return;

        setNodes(prevNodes => {
            let shouldUpdate = false;
            const validatedNodes = prevNodes.map((node: any) => {
                const dbTable = dbSchema.find(t => t.tableName === node.data.tableName);
                const isStale = !dbTable;
                
                let finalData = { ...node.data, isStale };
                let nodeChanged = node.data.isStale !== isStale;

                if (dbTable && node.data.columns) {
                    const existingDBColNames = new Set(dbTable.columns.map((c: any) => c.name));
                    
                    let columnsChanged = false;
                    const validatedColumns = node.data.columns.map((col: any) => {
                        const colStale = !existingDBColNames.has(col.name);
                        if (col.isStale !== colStale) columnsChanged = true;
                        return { ...col, isStale: colStale };
                    });

                    const existingLoadedColNames = new Set(node.data.columns.map((c: any) => c.name));
                    const newColumns = dbTable.columns.filter((dbCol: any) => !existingLoadedColNames.has(dbCol.name));
                    
                    if (newColumns.length > 0) {
                        const appendedColumns = newColumns.map((dbCol: any) => ({
                            name: dbCol.name,
                            type: dbCol.type,
                            isSelected: false,
                            isStale: false
                        }));
                        finalData.columns = [...validatedColumns, ...appendedColumns];
                        nodeChanged = true;
                    } else {
                        finalData.columns = validatedColumns;
                        if (columnsChanged) nodeChanged = true;
                    }
                }

                if (nodeChanged) {
                    shouldUpdate = true;
                    return { ...node, data: finalData };
                }
                return node;
            });
            return shouldUpdate ? validatedNodes : prevNodes;
        });
    }, [dbSchema, isConnected, setNodes, validationTrigger]);

    const connectDb = (connString: string) => {
        setIsConnecting(true);
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'CONNECT_DB', payload: connString });
    };

    const generateSQL = () => {
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'GENERATE_SQL', payload: { nodes, edges } });
    };

    const runVisualQuery = () => {
        setQueryError(null);
        setQueryResults(null);
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'EXECUTE_VISUAL_QUERY', payload: { nodes, edges } });
    };

    const refreshSchema = () => {
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'REQUEST_TABLES' });
    };

    const loadWorkspace = () => {
        // @ts-ignore
        if (window.vscodeApi) {
            window.vscodeApi.postMessage({ command: 'REQUEST_TABLES' });
            window.vscodeApi.postMessage({ command: 'LOAD_WORKSPACE' });
        }
    };

    const saveWorkspace = () => {
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'SAVE_WORKSPACE', payload: { nodes, edges } });
    };

    const runSelectedBatch = useCallback(() => {
        if (!selectedNodeId) {
            runVisualQuery();
            return;
        }
        setQueryError(null);
        setQueryResults(null);
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ 
            command: 'EXECUTE_VISUAL_BATCH', 
            payload: { nodes, edges, targetNodeId: selectedNodeId } 
        });
    }, [nodes, edges, selectedNodeId]);

    const generateBatchSQL = useCallback(() => {
        if (!selectedNodeId) {
            generateSQL();
            return;
        }
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ 
            command: 'GENERATE_BATCH_SQL', 
            payload: { nodes, edges, targetNodeId: selectedNodeId } 
        });
    }, [nodes, edges, selectedNodeId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F5 or Ctrl+Enter -> Run Batch
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault();
                runSelectedBatch();
            }
            // Ctrl+Shift+S -> Save
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                saveWorkspace();
            }
            // Ctrl+O -> Load
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                loadWorkspace();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [runSelectedBatch]);

    const onSelectionChange = useCallback(({ nodes: selectedNodes }: any) => {
        if (selectedNodes.length > 0) {
            setSelectedNodeId(selectedNodes[0].id);
        } else {
            setSelectedNodeId(null);
        }
    }, []);

    const onConnect = useCallback((connection: Connection) => {
        const sourceNode = nodes.find((n: any) => n.id === connection.source);
        const targetNode = nodes.find((n: any) => n.id === connection.target);
        
        let sourceType = 'unknown';
        let targetType = 'unknown';
        
        if (sourceNode && targetNode) {
            const sCol = sourceNode.data.columns.find((c: any) => `out-${c.name}` === connection.sourceHandle);
            const tCol = targetNode.data.columns.find((c: any) => `in-${c.name}` === connection.targetHandle);
            sourceType = sCol?.type;
            targetType = tCol?.type;
        }

        if (sourceType !== targetType) {
            alert(`DATA TYPE MISMATCH: Cannot join type [${sourceType}] with type [${targetType}]. Type safety enforced.`);
            return;
        }

        const newEdge = { ...connection, type: 'joinEdge', data: { joinType: 'INNER' } };
        setEdges((eds) => addEdge(newEdge, eds));
    }, [nodes, setEdges]);
    
    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: any) => {
        event.preventDefault();

        const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
        const typeDefinition = event.dataTransfer.getData('application/reactflow');
        
        if (!typeDefinition || !reactFlowBounds || !reactFlowInstance) {
            return;
        }

        const tableDef = JSON.parse(typeDefinition);
        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
            id: getId(),
            type: 'tableNode',
            position,
            data: { tableName: tableDef.tableName, columns: tableDef.columns },
        };

        setNodes((nds) => nds.concat(newNode));
    }, [reactFlowInstance, setNodes]);

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {!isConnected && <ConnectionModal onConnect={connectDb} isConnecting={isConnecting} />}
            <div style={{ padding: '8px 16px', background: 'var(--vscode-editorGroupHeader-tabsBackground)', borderBottom: '1px solid var(--vscode-panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isConnected ? '#4CAF50' : '#F44336' }}></div>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>SQL Visualize Engine</span>
                </div>
                <div>
                   {!isConnected && <span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '11px', fontStyle: 'italic', marginRight: '16px' }}>Workspace loaded. Connect to validate schema & run queries.</span>}
                   <button onClick={() => { setIsConnected(false); setNodes([]); setEdges([]); setDbSchema([]); setPreviewData(null); setQueryResults(null); }} style={{ padding: '6px 16px', background: 'transparent', color: 'var(--vscode-button-secondaryForeground)', border: '1px solid var(--vscode-button-secondaryBackground)', cursor: 'pointer', borderRadius: '2px', marginRight: '16px' }}>Disconnect</button>
                   
                   <button onClick={loadWorkspace} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', cursor: 'pointer', borderRadius: '2px', marginRight: '4px' }} title="Load .sqlviz workspace (Ctrl+O)">📂 Load</button>
                   <button onClick={saveWorkspace} disabled={nodes.length === 0} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', marginRight: '12px', opacity: nodes.length === 0 ? 0.5 : 1 }} title="Save to .sqlviz workspace (Ctrl+Shift+S)">💾 Save</button>

                   <span style={{ borderLeft: '1px solid var(--vscode-panel-border)', marginRight: '12px', height: '16px' }}></span>

                   <button 
                        onClick={runSelectedBatch} 
                        disabled={nodes.length === 0} 
                        style={{ padding: '6px 16px', background: selectedNodeId ? 'var(--vscode-button-background)' : 'transparent', color: selectedNodeId ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-background)', border: selectedNodeId ? 'none' : '1px solid var(--vscode-button-background)', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', fontWeight: 'bold', marginRight: '8px', opacity: nodes.length === 0 ? 0.5 : 1 }}
                        title={selectedNodeId ? "Run Selected Batch (F5)" : "Run Entire Canvas (F5)"}
                    >
                        {selectedNodeId ? '▶ Run Selection' : '▶ Run All'}
                   </button>
                   <button 
                        onClick={generateBatchSQL} 
                        disabled={nodes.length === 0} 
                        style={{ padding: '6px 16px', background: 'transparent', color: 'var(--vscode-button-foreground)', border: '1px solid var(--vscode-panel-border)', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', fontWeight: 'bold', opacity: nodes.length === 0 ? 0.5 : 1 }}
                        title={selectedNodeId ? "Export Selection SQL" : "Export Entire Canvas SQL"}
                    >
                        {selectedNodeId ? '📄 Export Selection' : '📄 Export All'}
                   </button>
                </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                {isConnected && <Sidebar dbSchema={dbSchema} onRefresh={refreshSchema} />}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }} ref={reactFlowWrapper}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <ReactFlowProvider>
                            <ReactFlow 
                                nodes={nodes} 
                                edges={edges} 
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onInit={setReactFlowInstance}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onSelectionChange={onSelectionChange}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                            >
                                <Background />
                                <Controls />
                            </ReactFlow>
                        </ReactFlowProvider>
                    </div>
                    {(previewData || queryResults || queryError) && (
                        <div style={{ height: '300px', borderTop: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '6px 12px', background: 'var(--vscode-editorGroupHeader-tabsBackground)', borderBottom: '1px solid var(--vscode-panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-editor-foreground)', letterSpacing: '0.5px' }}>
                                    {previewData ? `Data Preview: ${previewData.table} (TOP 25)` : (queryResults ? `Query Results (${queryResults.rowsAffected} rows affected)` : 'Query Execution Error')}
                                </span>
                                <button onClick={() => { setPreviewData(null); setQueryResults(null); setQueryError(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', outline: 'none' }} title="Close">✖</button>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                                {queryError ? (
                                    <div style={{ padding: '20px', color: '#f48771', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                                        {queryError}
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', fontFamily: 'var(--vscode-editor-font-family)' }}>
                                        <thead style={{ background: 'var(--vscode-editor-inactiveSelectionBackground)', position: 'sticky', top: 0, zIndex: 10 }}>
                                            <tr>
                                                {((previewData && previewData.records && previewData.records.length > 0) || (queryResults && queryResults.data && queryResults.data.length > 0)) && Object.keys(previewData?.records?.[0] || queryResults?.data?.[0]).map(k => (
                                                    <th key={k} style={{ padding: '8px 12px', borderBottom: '1px solid var(--vscode-panel-border)', color: 'var(--vscode-editor-foreground)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{k}</th>
                                                ))}
                                                {((previewData && previewData.records.length === 0) || (queryResults && queryResults.data.length === 0)) && (
                                                    <th style={{ padding: '8px 12px' }}>Status</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {((previewData && previewData.records && previewData.records.length === 0) || (queryResults && queryResults.data && queryResults.data.length === 0)) ? (
                                                <tr><td colSpan={100} style={{ padding: '16px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>No records returned.</td></tr>
                                            ) : (
                                                (previewData?.records || queryResults?.data || []).map((r, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid var(--vscode-panel-border)', background: i % 2 === 0 ? 'transparent' : 'var(--vscode-list-inactiveSelectionBackground)' }}>
                                                        {Object.values(r).map((v: any, j) => (
                                                            <td key={j} style={{ padding: '6px 12px', color: 'var(--vscode-editor-foreground)', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v === null ? <span style={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>NULL</span> : String(v)}</td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
