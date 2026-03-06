import React from 'react';

interface StatusBarProps {
  isConnected: boolean;
  isListening: boolean;
  isProcessing: boolean;
  sessionId: string;
}

export function StatusBar({
  isConnected,
  isListening,
  isProcessing,
  sessionId,
}: StatusBarProps) {
  let state = 'idle';
  if (isProcessing) {
    state = 'processing';
  } else if (isListening) {
    state = 'listening';
  }

  const getStateColor = () => {
    switch (state) {
      case 'listening':
        return '#58a6ff';
      case 'processing':
        return '#f85149';
      default:
        return '#8b949e';
    }
  };

  const getStateBadgeStyle = () => {
    switch (state) {
      case 'listening':
        return 'state-badge listening';
      case 'processing':
        return 'state-badge processing';
      default:
        return 'state-badge';
    }
  };

  return (
    <footer className="status-bar">
      <div className="status-state">
        <div
          className={getStateBadgeStyle()}
          style={{
            color: getStateColor(),
          }}
        >
          {state.charAt(0).toUpperCase() + state.slice(1)}
        </div>
        {sessionId && (
          <span style={{ fontSize: '11px', color: '#8b949e' }}>
            Session: {sessionId.substring(0, 8)}...
          </span>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#8b949e' }}>
        {isConnected ? (
          <>
            <span style={{ color: '#3fb950' }}>●</span> Connected to LivePair
          </>
        ) : (
          <>
            <span style={{ color: '#f85149' }}>●</span> Disconnected
          </>
        )}
      </div>
    </footer>
  );
}
