export interface ColumnFilter {
    operator: string;
    value?: string;
}

export interface ColumnData {
    name: string;
    type: string;
    isSelected?: boolean;
    alias?: string;
    function?: string;
    filter?: ColumnFilter;
    isStale?: boolean;
}

export interface TableNodeData {
    tableName: string;
    tableAlias?: string;
    columns: ColumnData[];
    isStale?: boolean;
}

export interface Node {
    id: string;
    type: string;
    data: TableNodeData;
    position: { x: number; y: number };
}

export interface EdgeData {
    joinType?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

export interface Edge {
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
    type?: string;
    data?: EdgeData;
}
