import React, { useCallback, useEffect } from 'react';
import ReactFlow, { addEdge, Background, Controls, Node, Edge, Connection, useNodesState, useEdgesState } from 'reactflow';
import { TableNode } from './components/TableNode';
import { JoinEdge } from './components/JoinEdge';
import 'reactflow/dist/style.css';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { joinEdge: JoinEdge };

export const App = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

    useEffect(() => {
        // Central hub for receiving messages from Extension Host
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'TABLE_DATA':
                    const tables = message.payload;
                    // Map introsected data to renderable Table Nodes
                    const newNodes = tables.map((t: any, index: number) => ({
                        id: `table-${index}`,
                        type: 'tableNode',
                        position: { x: 100 + (index * 400), y: 100 },
                        data: { tableName: t.tableName, columns: t.columns }
                    }));
                    setNodes(newNodes);
                    break;
            }
        };
        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const requestTables = () => {
        // Trigger MS-MSSQL Introspection pipeline
        // @ts-ignore
        if (window.vscodeApi) {
            // @ts-ignore
            window.vscodeApi.postMessage({ command: 'REQUEST_TABLES' });
        } else {
            console.warn('VS Code API not found, running outside of VS Code!');
        }
    };

    const generateSQL = () => {
        // Send AST mappings to VS code
        // @ts-ignore
        if (window.vscodeApi) {
            // @ts-ignore
            window.vscodeApi.postMessage({ command: 'GENERATE_SQL', payload: { nodes, edges } });
        }
    };

    const onConnect = useCallback((connection: Connection) => {
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        
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
    }, [nodes]);

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', background: 'var(--vscode-sideBar-background)', borderBottom: '1px solid var(--vscode-panel-border)', display: 'flex', gap: '8px' }}>
                <button onClick={requestTables} style={{ padding: '6px 16px', background: 'var(--vscode-button-secondaryBackground)', color: 'var(--vscode-button-secondaryForeground)', border: '1px solid var(--vscode-button-border)', cursor: 'pointer', borderRadius: '2px' }}>Introspect Database</button>
                <button onClick={generateSQL} style={{ padding: '6px 16px', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: '1px solid var(--vscode-button-border)', cursor: 'pointer', borderRadius: '2px' }}>Generate SQL</button>
            </div>
            <div style={{ flex: 1 }}>
                <ReactFlow 
                    nodes={nodes} 
                    edges={edges} 
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onConnect={onConnect}
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
};
