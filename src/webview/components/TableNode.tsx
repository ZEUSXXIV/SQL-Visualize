import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export const TableNode = ({ data, id }: any) => {
    const { setNodes, setEdges } = useReactFlow();

    const updateColumn = (colName: string, field: string, value: any) => {
        setNodes((nds) => 
            nds.map((node) => {
                if (node.id === id) {
                    node.data = {
                        ...node.data,
                        columns: node.data.columns.map((col: any) => {
                            if (col.name === colName) {
                                return { ...col, [field]: value };
                            }
                            return col;
                        })
                    };
                }
                return node;
            })
        );
    };

    const deleteTable = () => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    };

    return (
        <div style={{ background: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: '4px', minWidth: '320px', fontSize: '12px' }}>
            <div style={{ background: 'var(--vscode-editorGroupHeader-tabsBackground)', padding: '8px', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{data.tableName}</span>
                <button 
                  onClick={deleteTable} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', outline: 'none' }} 
                  title="Remove Table"
                >✖</button>
            </div>
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.columns.map((col: any) => (
                    <div key={col.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', gap: '6px' }}>
                        <Handle type="target" position={Position.Left} id={`in-${col.name}`} style={{ top: '50%' }} />
                        
                        <input 
                            title="Toggle Column in SELECT Output"
                            type="checkbox" 
                            checked={col.isSelected !== false} 
                            onChange={(e) => updateColumn(col.name, 'isSelected', e.target.checked)} 
                            style={{ margin: 0 }}
                        />
                        
                        <span style={{ flex: 1, textDecoration: col.isSelected === false ? 'line-through' : 'none', opacity: col.isSelected === false ? 0.4 : 1 }}>
                            {col.name} <span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '0.9em' }}>{col.type}</span>
                        </span>
                        
                        <select 
                            style={{ fontSize: '10px', background: 'var(--vscode-dropdown-background)', color: 'var(--vscode-dropdown-foreground)', border: '1px solid var(--vscode-dropdown-border)', outline: 'none' }}
                            value={col.function || ""}
                            onChange={(e) => updateColumn(col.name, 'function', e.target.value)}
                        >
                            <option value="">- Func -</option>
                            <option value="MAX">MAX</option>
                            <option value="MIN">MIN</option>
                            <option value="COUNT">COUNT</option>
                            <option value="SUM">SUM</option>
                            <option value="AVG">AVG</option>
                            <option value="UPPER">UPPER</option>
                            <option value="LOWER">LOWER</option>
                        </select>
                        
                        <input 
                            type="text" 
                            placeholder="Alias" 
                            value={col.alias || ""}
                            style={{ width: '50px', fontSize: '10px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', outline: 'none', padding: '2px' }} 
                            onChange={(e) => updateColumn(col.name, 'alias', e.target.value)}
                        />
                        <Handle type="source" position={Position.Right} id={`out-${col.name}`} style={{ top: '50%' }} />
                    </div>
                ))}
            </div>
        </div>
    );
};
