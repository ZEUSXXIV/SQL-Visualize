import React, { useState, useMemo } from 'react';

interface Column {
    name: string;
    type: string;
    isStale?: boolean;
}

interface TableDef {
    tableName: string;
    columns: Column[];
    foreignKeys?: any[];
}

export const Sidebar = ({ dbSchema, onRefresh }: { dbSchema: TableDef[], onRefresh: () => void }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['[dbo]'])); // Expand dbo by default
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

    // Grouping Logic
    const groupedSchema = useMemo(() => {
        const groups: Record<string, TableDef[]> = {};
        dbSchema.forEach(table => {
            // Extract schema from [schema].[table] format
            const match = table.tableName.match(/^\[(.+?)\]/);
            const schema = match ? `[${match[1]}]` : '[root]';
            if (!groups[schema]) groups[schema] = [];
            groups[schema].push(table);
        });
        return groups;
    }, [dbSchema]);

    const toggleSchema = (schema: string) => {
        const next = new Set(expandedSchemas);
        if (next.has(schema)) next.delete(schema);
        else next.add(schema);
        setExpandedSchemas(next);
    };

    const toggleTable = (table: string) => {
        const next = new Set(expandedTables);
        if (next.has(table)) next.delete(table);
        else next.add(table);
        setExpandedTables(next);
    };

    const onDragStart = (event: React.DragEvent, tableDef: any) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(tableDef));
        event.dataTransfer.effectAllowed = 'move';
    };

    const triggerPreview = (tableName: string) => {
        // @ts-ignore
        if (window.vscodeApi) window.vscodeApi.postMessage({ command: 'PREVIEW_TABLE', table: tableName });
    };

    // Filter Logic
    const filteredGroups = useMemo(() => {
        if (!searchQuery) return groupedSchema;
        const filtered: Record<string, TableDef[]> = {};
        Object.entries(groupedSchema).forEach(([schema, tables]) => {
            const matches = tables.filter(t => t.tableName.toLowerCase().includes(searchQuery.toLowerCase()));
            if (matches.length > 0) filtered[schema] = matches;
        });
        return filtered;
    }, [groupedSchema, searchQuery]);

    // Icons
    const ChevronDown = () => <svg width="12" height="12" viewBox="0 0 16 16"><path fill="currentColor" d="M7.976 10.072l4.357-4.357.62.618L7.976 11l-4.953-4.956.619-.619 4.334 4.347z"/></svg>;
    const ChevronRight = () => <svg width="12" height="12" viewBox="0 0 16 16"><path fill="currentColor" d="M10.072 8.024L5.715 3.667l.618-.62L11 8.024l-4.956 4.953-.619-.619 4.347-4.334z"/></svg>;
    const TableIcon = () => <svg width="12" height="12" viewBox="0 0 16 16"><path fill="currentColor" d="M13.5 2h-11l-.5.5v11l.5.5h11l.5-.5v-11l-.5-.5zM13 3v2H3V3h10zM3 6h10v2H3V6zm0 7v-4h10v4H3z"/></svg>;
    const ColumnIcon = () => <svg width="10" height="10" viewBox="0 0 16 16"><path fill="currentColor" d="M1 3h14v2H1V3zm0 4h14v2H1V7zm0 4h14v2H1v-2z"/></svg>;
    const EyeIcon = () => <svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 4c-3.1 0-5.8 2.1-7 5 1.2 2.9 3.9 5 7 5s5.8-2.1 7-5c-1.2-2.9-3.9-5-7-5zm0 8.5c-1.9-0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm0-6c-1.4 0-2.5 1.1-2.5 2.5S6.6 11.5 8 11.5s2.5-1.1 2.5-2.5S9.4 6.5 8 6.5z"/></svg>;
    const CollapseAllIcon = () => <svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 4.7L12.5 9.2l-.7.7L8 6.1l-3.8 3.8-.7-.7L8 4.7z M8 8.7L12.5 13.2l-.7.7L8 10.1l-3.8 3.8-.7-.7L8 8.7z"/></svg>;
    const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M13.6 2.3c-.5-.3-1.1-.3-1.5 0l-1.5 1.5c-1.1-.9-2.2-1.3-3.6-1.3-1.4 0-2.8.6-3.8 1.6l.8.8c.8-.8 1.9-1.3 3.1-1.3 1.2 0 2.2.4 3.1 1.1l-1.5 1.5c-.3.3-.3.9 0 1.2.3.3.9.3 1.2 0l2.5-2.5c.3-.3.3-.9 0-1.2l-.8-.8zM3.4 13.7c.5.3 1.1.3 1.5 0l1.5-1.5c1.1.9 2.2 1.3 3.6 1.3 1.4 0 2.8-.6 3.8-1.6l-.8-.8c-.8.8-1.9 1.3-3.1 1.3-1.2 0-2.2-.4-3.1-1.1l1.5-1.5c.3-.3.3-.9 0-1.2-.3-.3-.9-.3-1.2 0l-2.5 2.5c-.3.3-.3.9 0 1.2l.8.8z"/></svg>;

    const collapseAll = () => {
        setExpandedSchemas(new Set());
        setExpandedTables(new Set());
    };

    return (
        <div style={{ width: '280px', minWidth: '280px', background: 'var(--vscode-sideBar-background)', borderRight: '1px solid var(--vscode-panel-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-sideBarSectionHeader-background)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', height: '18px' }}>
                    <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-sideBarTitle-foreground)', letterSpacing: '0.8px', lineHeight: '18px' }}>Object Explorer</h3>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        <button 
                            onClick={collapseAll}
                            title="Collapse All"
                            style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            className="sidebar-btn"
                        >
                            <CollapseAllIcon />
                        </button>
                        <button 
                            onClick={onRefresh}
                            title="Refresh Schema"
                            style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            className="sidebar-btn"
                        >
                            <RefreshIcon />
                        </button>
                    </div>
                </div>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder="Search tables..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: '11px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', outline: 'none', borderRadius: '2px' }}
                    />
                </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                {Object.keys(filteredGroups).length === 0 ? (
                    <div style={{ padding: '20px 12px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', textAlign: 'center' }}>
                        {dbSchema.length === 0 ? 'Connecting to Database...' : 'No objects found.'}
                    </div>
                ) : (
                    Object.entries(filteredGroups).sort().map(([schema, tables]) => (
                        <div key={schema}>
                            {/* SCHEMA FOLDER */}
                            <div 
                                onClick={() => toggleSchema(schema)}
                                style={{ 
                                    padding: '4px 8px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    cursor: 'pointer', 
                                    fontSize: '11px', 
                                    fontWeight: 'bold',
                                    color: 'var(--vscode-foreground)',
                                    background: expandedSchemas.has(schema) ? 'rgba(255,255,255,0.03)' : 'transparent'
                                }}
                                className="sidebar-item"
                            >
                                {expandedSchemas.has(schema) ? <ChevronDown /> : <ChevronRight />}
                                📁 <span>{schema}</span>
                                <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '9px' }}>{tables.length}</span>
                            </div>

                            {/* TABLES */}
                            {(expandedSchemas.has(schema) || searchQuery.length > 0) && (
                                <div style={{ marginLeft: '12px' }}>
                                    {tables.sort((a,b) => a.tableName.localeCompare(b.tableName)).map((t: any) => (
                                        <div key={t.tableName}>
                                            <div 
                                                draggable
                                                onDragStart={(event) => onDragStart(event, t)}
                                                style={{ 
                                                    padding: '4px 8px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '6px', 
                                                    cursor: 'pointer', 
                                                    fontSize: '11px', 
                                                    color: 'var(--vscode-foreground)',
                                                    position: 'relative'
                                                }}
                                                className="sidebar-item group"
                                            >
                                                <div onClick={(e) => { e.stopPropagation(); toggleTable(t.tableName); }}>
                                                    {expandedTables.has(t.tableName) ? <ChevronDown /> : <ChevronRight />}
                                                </div>
                                                <TableIcon />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {t.tableName.split('.').pop()?.replace('[', '').replace(']', '')}
                                                </span>
                                                
                                                {/* QUICK ACTIONS */}
                                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }} className="quick-actions">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); triggerPreview(t.tableName); }}
                                                        title="Preview Data"
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--vscode-textLink-foreground)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                                                    >
                                                        <EyeIcon />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* COLUMNS */}
                                            {expandedTables.has(t.tableName) && (
                                                <div style={{ marginLeft: '24px', borderLeft: '1px solid var(--vscode-panel-border)', marginTop: '2px', marginBottom: '4px' }}>
                                                    {t.columns.map((c: any) => (
                                                        <div key={c.name} style={{ padding: '2px 12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8, fontSize: '10px' }}>
                                                            <ColumnIcon />
                                                            <span style={{ color: 'var(--vscode-foreground)' }}>{c.name}</span>
                                                            <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '9px' }}>{c.type}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            
            <style>{`
                .sidebar-item:hover { background: var(--vscode-list-hoverBackground) !important; }
                .sidebar-btn:hover { background: var(--vscode-list-hoverBackground) !important; }
                .quick-actions { opacity: 0; transition: opacity 0.1s; }
                .sidebar-item:hover .quick-actions { opacity: 1; }
            `}</style>
        </div>
    );
};
