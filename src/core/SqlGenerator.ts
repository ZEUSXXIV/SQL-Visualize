import { Node, Edge } from './types';

export class SqlGenerator {
    /**
     * Generates SQL for the provided nodes and edges.
     * @param nodes Array of nodes from React Flow
     * @param edges Array of edges from React Flow
     * @param targetNodeId Optional ID to only generate SQL for the connected component containing this node.
     * @returns A string containing the generated T-SQL.
     */
    public static generateSqlFromGraph(nodes: any[], edges: any[], targetNodeId?: string): string {
        let finalOutput = '';

        if (nodes.length === 0) return '';

        // 1. Build Adjacency List for Connected Components (Ignore suggestions)
        const activeEdges = edges.filter(e => e.type !== 'suggestedJoinEdge');
        const adj: Record<string, string[]> = {};
        nodes.forEach((n: any) => adj[n.id] = []);
        activeEdges.forEach((e: any) => {
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

        // 3. Generate SQL for specific component (if targetNodeId provided) or all
        const targetComponents = targetNodeId 
            ? components.filter(comp => comp.some(n => n.id === targetNodeId))
            : components;

        targetComponents.forEach((compNodes, idx) => {
            let selectColumns: string[] = [];
            let whereClauses: string[] = [];

            // Track column name occurrences to handle duplicates
            const colMetadata: any[] = [];
            const counters: Record<string, number> = {};

            compNodes.forEach((node: any) => {
                const tableReference = node.data.tableAlias || node.data.tableName;
                node.data.columns.forEach((col: any) => {
                    if (col.isSelected !== false) {
                        const targetName = col.alias || col.name;
                        counters[targetName] = (counters[targetName] || 0) + 1;
                        colMetadata.push({ node, col, targetName, tableReference });
                    }

                    // Process filters
                    if (col.filter && col.filter.operator) {
                        const op = col.filter.operator;
                        if (op === 'IS NULL' || op === 'IS NOT NULL') {
                            whereClauses.push(`${tableReference}.${col.name} ${op}`);
                        } else if (col.filter.value && typeof col.filter.value === 'string' && col.filter.value.trim() !== '') {
                            let val = col.filter.value.trim();
                            // Smart Quotes auto-wrapping
                            if (op !== 'IN') {
                                 const needsQuotes = /char|text|date|time|uniqueidentifier|string/i.test(col.type);
                                 if (needsQuotes && !val.startsWith("'")) {
                                     val = `'${val}'`;
                                 }
                            }
                            whereClauses.push(`${tableReference}.${col.name} ${op} ${val}`);
                        }
                    }
                });
            });

            // Generate actual SELECT strings
            colMetadata.forEach(meta => {
                let colStr = `${meta.tableReference}.${meta.col.name}`;
                if (meta.col.function && meta.col.function !== '') colStr = `${meta.col.function}(${colStr})`;
                
                if (counters[meta.targetName] > 1) {
                    const cleanTableName = meta.tableReference.replace(/\[|\]/g, '').replace(/\./g, '_');
                    const finalAlias = meta.col.alias || meta.col.name;
                    colStr += ` AS [${cleanTableName}.${finalAlias}]`;
                } else if (meta.col.alias && meta.col.alias !== '') {
                    colStr += ` AS [${meta.col.alias}]`;
                }
                selectColumns.push(colStr);
            });

            const root = compNodes[0];
            let fromTable = root.data.tableAlias ? `${root.data.tableName} AS ${root.data.tableAlias}` : root.data.tableName;
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
                        remainingEdges.forEach(e => {
                            const s = nodes.find((n: any) => n.id === e.source);
                            const t = nodes.find((n: any) => n.id === e.target);
                            const sTable = s.data.tableAlias || s.data.tableName;
                            const tTableDef = t.data.tableAlias ? `${t.data.tableName} AS ${t.data.tableAlias}` : t.data.tableName;
                            const tTable = t.data.tableAlias || t.data.tableName;
                            const sCol = e.sourceHandle.replace('out-', '');
                            const tCol = e.targetHandle.replace('in-', '');
                            const jType = e.data?.joinType || 'INNER';
                            joins.push(`${jType} JOIN ${tTableDef} ON ${sTable}.${sCol} = ${tTable}.${tCol}`);
                        });
                        break;
                    }
                    
                    const e = remainingEdges[edgeIdx];
                    remainingEdges.splice(edgeIdx, 1);
                    
                    const targetId = joinedSet.has(e.source) ? e.target : e.source;
                    joinedSet.add(targetId);
                    
                    const sNode = nodes.find((n: any) => n.id === e.source);
                    const tNode = nodes.find((n: any) => n.id === e.target);
                    const sTable = sNode.data.tableAlias || sNode.data.tableName;
                    const tTable = tNode.data.tableAlias || tNode.data.tableName;
                    const sCol = e.sourceHandle.replace('out-', '');
                    const tCol = e.targetHandle.replace('in-', '');
                    
                    const enteringNode = targetId === e.source ? sNode : tNode;
                    const enteringTableDef = enteringNode.data.tableAlias ? `${enteringNode.data.tableName} AS ${enteringNode.data.tableAlias}` : enteringNode.data.tableName;
                    const joinType = e.data?.joinType || 'INNER';
                    
                    joins.push(`${joinType} JOIN ${enteringTableDef} ON ${sTable}.${sCol} = ${tTable}.${tCol}`);
                }
            }

            let rawSql = `SELECT ${selectColumns.length > 0 ? selectColumns.join(', ') : '*'} FROM ${fromTable} ${joins.join(' ')}`;
            
            if (whereClauses.length > 0) {
                rawSql += `\nWHERE ${whereClauses.join(' AND ')}`;
            }
            
            const hasAgg = selectColumns.some(c => c.match(/(COUNT|SUM|MAX|MIN|AVG)\(/i));
            if (hasAgg) {
                const nonAgg = selectColumns.filter(c => !c.match(/(COUNT|SUM|MAX|MIN|AVG)\(/i)).map(c => c.split(' AS ')[0]);
                if (nonAgg.length > 0) rawSql += `\nGROUP BY ${nonAgg.join(', ')}`;
            }

            finalOutput += `-- Query Batch ${idx + 1} (${compNodes.map(n => n.data.tableName).join(', ')})\n${rawSql}\n\n`;
        });

        return finalOutput.trim();
    }
}
