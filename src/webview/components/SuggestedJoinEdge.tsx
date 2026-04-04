import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from 'reactflow';

export const SuggestedJoinEdge = ({
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

  const onAccept = () => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            type: 'joinEdge', // Convert to real join
            data: { ...edge.data, joinType: 'INNER' },
          };
        }
        return edge;
      })
    );
  };

  const onIgnore = () => {
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
            ...style, 
            strokeDasharray: '5,5', 
            stroke: 'var(--vscode-charts-blue)', 
            opacity: 0.6,
            strokeWidth: 2
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'var(--vscode-editor-background)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            border: '1px solid var(--vscode-charts-blue)',
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            zIndex: 1001
          }}
          className="nodrag nopan"
        >
          <span style={{ color: 'var(--vscode-charts-blue)', fontWeight: 'bold' }}>Suggestion</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
                onClick={onAccept}
                style={{ 
                    background: 'var(--vscode-button-background)', 
                    color: 'var(--vscode-button-foreground)', 
                    border: 'none', 
                    borderRadius: '2px', 
                    cursor: 'pointer', 
                    padding: '2px 6px',
                    fontSize: '9px',
                    fontWeight: 'bold'
                }}
            >
                Accept
            </button>
            <button 
                onClick={onIgnore}
                style={{ 
                    background: 'transparent', 
                    color: 'var(--vscode-descriptionForeground)', 
                    border: '1px solid var(--vscode-panel-border)', 
                    borderRadius: '2px', 
                    cursor: 'pointer', 
                    padding: '2px 6px',
                    fontSize: '9px'
                }}
            >
                ✕
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
