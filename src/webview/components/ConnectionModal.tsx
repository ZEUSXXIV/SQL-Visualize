import React, { useState } from 'react';

export const ConnectionModal = ({ onConnect, isConnecting }: { onConnect: (connString: string) => void, isConnecting: boolean }) => {
    const [connString, setConnString] = useState('');

    const handleConnect = () => {
        onConnect(connString);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--vscode-editor-background)', padding: '24px', borderRadius: '8px', border: '1px solid var(--vscode-panel-border)', width: '450px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', color: 'var(--vscode-editor-foreground)', fontSize: '18px' }}>Connect to SQL Server</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Enter your full MS SQL connection string to launch the autonomous visual mapping engine.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Connection String</label>
                    <input 
                        type="password" 
                        placeholder="Server=localhost;Database=master;User Id=sa;Password=secret;"
                        value={connString}
                        onChange={e => setConnString(e.target.value)}
                        disabled={isConnecting}
                        style={{ padding: '10px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', outline: 'none', borderRadius: '4px', fontFamily: 'monospace' }}
                    />
                </div>
                
                <button 
                    onClick={handleConnect}
                    disabled={isConnecting || !connString.trim()}
                    style={{ padding: '10px', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', cursor: isConnecting ? 'wait' : 'pointer', borderRadius: '4px', fontWeight: 'bold', marginTop: '8px' }}
                >
                    {isConnecting ? 'Establishing Connection...' : 'Connect Engine'}
                </button>
            </div>
        </div>
    );
};
