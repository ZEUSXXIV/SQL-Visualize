import React, { useState, useEffect, useRef } from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow, useNodes } from 'reactflow';

/**
 * Enhanced Venn Diagram Icons for Premium Look
 */
const VennIcon = ({ type, isSelected, onClick, uniqueId }: { type: string, isSelected: boolean, onClick: () => void, uniqueId: string }) => {
    const activeColor = 'var(--vscode-button-background)';
    const inactiveColor = 'rgba(128, 128, 128, 0.1)';
    const strokeColor = isSelected ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)';
    const strokeWidth = isSelected ? "1.5" : "1";

    return (
        <div 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                transition: 'all 0.2s ease',
                border: isSelected ? '1px solid var(--vscode-focusBorder)' : '1px solid transparent',
                width: '60px'
            }}
            className="join-type-option"
        >
            <svg width="40" height="24" viewBox="0 0 40 24" style={{ overflow: 'visible' }}>
                <defs>
                    <mask id={`mask-${type}-${uniqueId}`}>
                        <rect x="0" y="0" width="40" height="24" fill="white" />
                        {type === 'INNER' && <circle cx="15" cy="12" r="9" fill="black" />}
                    </mask>
                </defs>
                
                {/* Left Circle A */}
                <circle 
                    cx="15" cy="12" r="9" 
                    fill={(type === 'LEFT' || type === 'FULL' || type === 'INNER') ? activeColor : inactiveColor} 
                    stroke={isSelected ? activeColor : 'var(--vscode-descriptionForeground)'} 
                    strokeWidth={strokeWidth}
                    style={{ opacity: (type === 'LEFT' || type === 'FULL' || type === 'INNER') ? 1 : 0.4 }}
                />
                
                {/* Right Circle B */}
                <circle 
                    cx="25" cy="12" r="9" 
                    fill={(type === 'RIGHT' || type === 'FULL' || type === 'INNER') ? activeColor : inactiveColor} 
                    stroke={isSelected ? activeColor : 'var(--vscode-descriptionForeground)'} 
                    strokeWidth={strokeWidth}
                    style={{ opacity: (type === 'RIGHT' || type === 'FULL' || type === 'INNER') ? 1 : 0.4 }}
                />

                {/* Subtractive Overlays for clear visual distinction */}
                {type === 'LEFT' && (
                    <circle cx="25" cy="12" r="9" fill="var(--vscode-editor-background)" style={{ opacity: 0.8 }} />
                )}
                {type === 'RIGHT' && (
                    <circle cx="15" cy="12" r="9" fill="var(--vscode-editor-background)" style={{ opacity: 0.8 }} />
                )}
                {type === 'INNER' && (
                    <>
                        <circle cx="15" cy="12" r="9" fill="var(--vscode-editor-background)" style={{ opacity: 0.6 }} />
                        <circle cx="25" cy="12" r="9" fill="var(--vscode-editor-background)" style={{ opacity: 0.6 }} />
                        <g clipPath={`url(#intersect-clip-${uniqueId})`}>
                            <circle cx="15" cy="12" r="9" fill={activeColor} />
                        </g>
                        <defs>
                            <clipPath id={`intersect-clip-${uniqueId}`}>
                                <circle cx="25" cy="12" r="9" />
                            </clipPath>
                        </defs>
                    </>
                )}
            </svg>
            <span style={{ fontSize: '9px', fontWeight: isSelected ? 'bold' : 'normal', color: 'var(--vscode-editor-foreground)', textTransform: 'uppercase' }}>{type}</span>
        </div>
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
  sourceHandleId,
  targetHandleId,
  source,
  target
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const nodes = useNodes();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateJoinType = (joinType: string) => {
      setEdges((eds) => 
          eds.map((edge) => {
              if (edge.id === id) {
                  return { ...edge, data: { ...edge.data, joinType } };
              }
              return edge;
          })
      );
  };

  const deleteJoin = () => {
      setEdges((eds) => eds.filter(e => e.id !== id));
  };
  
  const currentJoinType = data?.joinType || "INNER";

  // Find table/column info for display
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  const sourceCol = sourceHandleId?.replace('out-', '');
  const targetCol = targetHandleId?.replace('in-', '');
  const sourceTable = (sourceNode?.data as any)?.tableName || 'Source';
  const targetTable = (targetNode?.data as any)?.tableName || 'Target';

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: isOpen ? 'var(--vscode-focusBorder)' : 'var(--vscode-descriptionForeground)' }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Join Badge Trigger */}
          <div 
             onClick={() => setIsOpen(!isOpen)}
             style={{
                width: '24px',
                height: '24px',
                background: isOpen ? 'var(--vscode-focusBorder)' : 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
                color: isOpen ? 'var(--vscode-button-foreground)' : 'var(--vscode-editor-foreground)',
                fontWeight: 'bold',
                fontSize: '10px'
             }}
             title={`${currentJoinType} JOIN: ${sourceTable}.${sourceCol} = ${targetTable}.${targetCol}`}
          >
             {currentJoinType[0]}
          </div>

          {/* Join Editor Popover */}
          {isOpen && (
            <div
              ref={popoverRef}
              style={{
                position: 'absolute',
                top: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '6px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                padding: '12px',
                width: '280px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--vscode-descriptionForeground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Join Configuration</span>
                <button 
                  onClick={deleteJoin} 
                  style={{ background: 'transparent', border: 'none', color: '#f48771', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ fontSize: '14px' }}>✖</span> Delete
                </button>
              </div>

              {/* Join Condition Summary */}
              <div style={{ 
                  background: 'var(--vscode-editor-inactiveSelectionBackground)', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontFamily: 'monospace',
                  border: '1px solid var(--vscode-panel-border)',
                  color: 'var(--vscode-editor-foreground)',
                  textAlign: 'center'
              }}>
                <span style={{ color: 'var(--vscode-symbolIcon-classForeground)' }}>{sourceTable}</span>.{sourceCol} 
                <br/>
                <span style={{ color: 'var(--vscode-descriptionForeground)', margin: '0 8px' }}>=</span>
                <br/>
                <span style={{ color: 'var(--vscode-symbolIcon-classForeground)' }}>{targetTable}</span>.{targetCol}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                <VennIcon type="INNER" isSelected={currentJoinType === 'INNER'} onClick={() => updateJoinType('INNER')} uniqueId={id} />
                <VennIcon type="LEFT" isSelected={currentJoinType === 'LEFT'} onClick={() => updateJoinType('LEFT')} uniqueId={id} />
                <VennIcon type="RIGHT" isSelected={currentJoinType === 'RIGHT'} onClick={() => updateJoinType('RIGHT')} uniqueId={id} />
                <VennIcon type="FULL" isSelected={currentJoinType === 'FULL'} onClick={() => updateJoinType('FULL')} uniqueId={id} />
              </div>

              <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid var(--vscode-panel-border)', paddingTop: '8px' }}>
                {currentJoinType === 'INNER' && 'Returns only matching rows from both tables.'}
                {currentJoinType === 'LEFT' && 'Returns all rows from source, and matching from target.'}
                {currentJoinType === 'RIGHT' && 'Returns all rows from target, and matching from source.'}
                {currentJoinType === 'FULL' && 'Returns all rows when there is a match in either table.'}
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
