import React, { useState } from 'react';

export const Sidebar = ({ dbSchema }: { dbSchema: any[] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const onDragStart = (event: React.DragEvent, tableDef: any) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(tableDef));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div style={{ width: '250px', background: 'var(--vscode-sideBar-background)', borderRight: '1px solid var(--vscode-panel-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-sideBarSectionHeader-background)' }}>
                <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-sideBarTitle-foreground)', letterSpacing: '1px' }}>Object Explorer</h3>
                <p style={{ margin: '4px 0 8px 0', fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>Drag tables to Canvas</p>
                <input 
                    type="text" 
                    placeholder="Search tables..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px', fontSize: '11px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', outline: 'none', borderRadius: '3px' }}
                />
            </div>
            
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {dbSchema.filter(t => t.tableName.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>
                        {dbSchema.length === 0 ? 'Loading Schema Tree...' : 'No tables match search.'}
                    </div>
                ) : (
                    dbSchema.filter(t => t.tableName.toLowerCase().includes(searchQuery.toLowerCase())).map((t: any) => (
                        <div 
                            key={t.tableName}
                            onDragStart={(event: React.DragEvent) => onDragStart(event, t)}
                            draggable
                            style={{ 
                                padding: '8px', 
                                background: 'transparent',
                                border: '1px solid var(--vscode-list-hoverBackground)',
                                color: 'var(--vscode-foreground)', 
                                borderRadius: '4px', 
                                cursor: 'grab', 
                                fontSize: '12px', 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                transition: 'all 0.15s ease'
                            }}
                            title="Drag to Canvas"
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            📊 <span style={{ marginLeft: '4px' }}>{t.tableName}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
