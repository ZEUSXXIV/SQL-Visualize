import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export const TableNode = ({ data, id }: any) => {
    const { setNodes, setEdges } = useReactFlow();
    const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

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

    const updateTableAlias = (alias: string) => {
        setNodes((nds) => 
            nds.map((node) => {
                if (node.id === id) {
                    node.data = { ...node.data, tableAlias: alias };
                }
                return node;
            })
        );
    };

    const deleteTable = () => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    };

    const previewData = (e: React.MouseEvent) => {
        e.stopPropagation();
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'PREVIEW_TABLE', table: data.tableName });
    };

    return (
        <div style={{ background: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: '4px', minWidth: '320px', fontSize: '12px' }}>
            <div style={{ background: 'var(--vscode-editorGroupHeader-tabsBackground)', padding: '8px', borderBottom: '1px solid var(--vscode-panel-border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="nodrag" onClick={previewData} style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', padding: '0', fontSize: '14px', outline: 'none' }} title="Preview Live Data (TOP 25)">👁️</button>
                    <span>{data.tableName}</span>
                    <input 
                        title="Table Alias"
                        type="text" 
                        placeholder="Alias (e.g. t1)" 
                        value={data.tableAlias || ""}
                        onChange={(e) => updateTableAlias(e.target.value)}
                        style={{ width: '80px', fontSize: '10px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', outline: 'none', padding: '2px', fontWeight: 'normal' }}
                    />
                </div>
                <button 
                  onClick={deleteTable} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', outline: 'none' }} 
                  title="Remove Table"
                >✖</button>
            </div>
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.columns.map((col: any) => (
                    <React.Fragment key={col.name}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', gap: '6px' }}>
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
                            
                            <button className="nodrag" onClick={() => setExpandedFilter(expandedFilter === col.name ? null : col.name)} title={col.filter?.operator ? 'Edit Filter' : 'Add Filter'} style={{ background: col.filter?.operator ? 'var(--vscode-button-background)' : 'transparent', color: col.filter?.operator ? 'var(--vscode-button-foreground)' : 'var(--vscode-icon-foreground)', border: col.filter?.operator ? 'none' : '1px solid transparent', cursor: 'pointer', padding: '1px 4px', borderRadius: '2px', fontSize: '10px' }}>
                                🔍
                            </button>

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
                        {expandedFilter === col.name && (
                            <div className="nodrag" style={{ padding: '6px 20px', background: 'var(--vscode-editor-inactiveSelectionBackground)', display: 'flex', gap: '6px', borderTop: '1px solid var(--vscode-panel-border)', borderBottom: '1px solid var(--vscode-panel-border)' }}>
                                <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', alignSelf: 'center' }}>WHERE {col.name}</span>
                                <select 
                                    value={col.filter?.operator || '='}
                                    onChange={(e) => updateColumn(col.name, 'filter', { ...col.filter, operator: e.target.value })}
                                    style={{ fontSize: '10px', background: 'var(--vscode-dropdown-background)', color: 'var(--vscode-dropdown-foreground)', border: '1px solid var(--vscode-dropdown-border)', outline: 'none', padding: '2px' }}
                                >
                                    <option value="=">=</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                    <option value=">=">&gt;=</option>
                                    <option value="<=">&lt;=</option>
                                    <option value="!=">!=</option>
                                    <option value="LIKE">LIKE</option>
                                    <option value="IS NULL">IS NULL</option>
                                    <option value="IS NOT NULL">IS NOT NULL</option>
                                    <option value="IN">IN</option>
                                </select>
                                {col.filter?.operator !== 'IS NULL' && col.filter?.operator !== 'IS NOT NULL' && (
                                    <input 
                                        type="text" 
                                        placeholder={col.filter?.operator === 'IN' ? "(1, 2, 3) or ('A', 'B')" : "Value"} 
                                        value={col.filter?.value || ''}
                                        onChange={(e) => updateColumn(col.name, 'filter', { ...col.filter, value: e.target.value, operator: col.filter?.operator || '=' })}
                                        style={{ flex: 1, fontSize: '10px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', outline: 'none', padding: '2px', minWidth: '60px' }} 
                                    />
                                )}
                                <button onClick={() => updateColumn(col.name, 'filter', undefined)} style={{ background: 'transparent', border: 'none', color: '#f48771', cursor: 'pointer', padding: '0 4px', fontSize: '10px' }} title="Clear Filter">✖</button>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
