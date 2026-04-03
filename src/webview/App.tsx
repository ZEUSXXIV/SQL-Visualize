import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, { addEdge, Background, Controls, Node, Edge, Connection, useNodesState, useEdgesState, ReactFlowProvider } from 'reactflow';
import { TableNode } from './components/TableNode';
import { JoinEdge } from './components/JoinEdge';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import 'reactflow/dist/style.css';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { joinEdge: JoinEdge };

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
            }
        };
        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const connectDb = (connString: string) => {
        setIsConnecting(true);
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'CONNECT_DB', payload: connString });
    };

    const generateSQL = () => {
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'GENERATE_SQL', payload: { nodes, edges } });
    };

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
                   <button onClick={() => { setIsConnected(false); setNodes([]); setEdges([]); setDbSchema([]); }} style={{ padding: '6px 16px', background: 'transparent', color: 'var(--vscode-button-secondaryForeground)', border: '1px solid var(--vscode-button-secondaryBackground)', cursor: 'pointer', borderRadius: '2px', marginRight: '12px' }}>Disconnect</button>
                   <button onClick={generateSQL} disabled={nodes.length === 0} style={{ padding: '6px 16px', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', fontWeight: 'bold', opacity: nodes.length === 0 ? 0.5 : 1 }}>Export SQL Batch</button>
                </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                {isConnected && <Sidebar dbSchema={dbSchema} />}
                <div style={{ flex: 1, position: 'relative' }} ref={reactFlowWrapper}>
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
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                        >
                            <Background />
                            <Controls />
                        </ReactFlow>
                    </ReactFlowProvider>
                </div>
            </div>
        </div>
    );
};
