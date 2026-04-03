import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from 'reactflow';

export const JoinEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const updateJoinType = (joinType: string) => {
      setEdges((eds) => 
          eds.map((edge) => {
              if (edge.id === id) {
                  edge.data = { ...edge.data, joinType };
              }
              return edge;
          })
      );
  };

  const deleteJoin = () => {
      setEdges((eds) => eds.filter(e => e.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'var(--vscode-editor-background)',
            padding: '4px',
            borderRadius: '4px',
            fontSize: '11px',
            border: '2px solid var(--vscode-focusBorder)',
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
          className="nodrag nopan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--vscode-editor-foreground)' }}>JOIN Config</span>
              <button 
                  onClick={deleteJoin} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', outline: 'none', padding: '0 2px' }} 
                  title="Remove JOIN"
                >✖</button>
          </div>
          <select 
            value={data?.joinType || "INNER"} 
            onChange={(e) => updateJoinType(e.target.value)}
            style={{ 
                background: 'var(--vscode-dropdown-background)', 
                color: 'var(--vscode-dropdown-foreground)', 
                border: '1px solid var(--vscode-dropdown-border)',
                outline: 'none',
                cursor: 'pointer'
            }}
          >
              <option value="INNER">INNER JOIN</option>
              <option value="LEFT">LEFT JOIN</option>
              <option value="RIGHT">RIGHT JOIN</option>
              <option value="FULL">FULL OUTER</option>
          </select>
          <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>Preview: {data?.joinType || 'INNER'}</div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
