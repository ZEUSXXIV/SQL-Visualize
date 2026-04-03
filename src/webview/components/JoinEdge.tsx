import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from 'reactflow';

const VennIcon = ({ type, isSelected, onClick, uniqueId }: { type: string, isSelected: boolean, onClick: () => void, uniqueId: string }) => {
    const activeColor = isSelected ? 'var(--vscode-button-background)' : 'var(--vscode-focusBorder)';
    const inactiveColor = 'transparent';
    const strokeColor = isSelected ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)';
    const strokeWidth = isSelected ? "1.5" : "1";

    return (
        <svg onClick={onClick} width="28" height="18" viewBox="0 0 30 20" style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.6 }}>
            <title>{type} JOIN</title>
            {/* Left Circle A */}
            <circle cx="11" cy="10" r="7" fill={(type === 'LEFT' || type === 'FULL') ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Right Circle B */}
            <circle cx="19" cy="10" r="7" fill={(type === 'RIGHT' || type === 'FULL') ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            
            {/* Intersection Overlay */}
            { ['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(type) && (
               <g clipPath={`url(#intersect-${uniqueId}-${type})`}>
                  <circle cx="11" cy="10" r="7" fill={activeColor} />
               </g>
            )}
            <defs>
               <clipPath id={`intersect-${uniqueId}-${type}`}>
                 <circle cx="19" cy="10" r="7" />
               </clipPath>
            </defs>
        </svg>
    );
};

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
  
  const currentJoinType = data?.joinType || "INNER";

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'var(--vscode-editor-background)',
            padding: '6px',
            borderRadius: '4px',
            fontSize: '11px',
            border: '1px solid var(--vscode-panel-border)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
          className="nodrag nopan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--vscode-panel-border)', paddingBottom: '3px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--vscode-editor-foreground)', fontSize: '10px' }}>{currentJoinType} JOIN</span>
              <button 
                  onClick={deleteJoin} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--vscode-icon-foreground)', cursor: 'pointer', outline: 'none', padding: '0 2px' }} 
                  title="Remove JOIN"
                >✖</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', paddingTop: '2px' }}>
              <VennIcon type="INNER" isSelected={currentJoinType === 'INNER'} onClick={() => updateJoinType('INNER')} uniqueId={id} />
              <VennIcon type="LEFT" isSelected={currentJoinType === 'LEFT'} onClick={() => updateJoinType('LEFT')} uniqueId={id} />
              <VennIcon type="RIGHT" isSelected={currentJoinType === 'RIGHT'} onClick={() => updateJoinType('RIGHT')} uniqueId={id} />
              <VennIcon type="FULL" isSelected={currentJoinType === 'FULL'} onClick={() => updateJoinType('FULL')} uniqueId={id} />
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
