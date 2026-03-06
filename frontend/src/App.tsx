import React, { useEffect, useState } from 'react';
import './styles.css';
import { AudioCapture } from './components/AudioCapture';
import { CodeEditor } from './components/CodeEditor';
import { Transcript } from './components/Transcript';
import { StatusBar } from './components/StatusBar';
import { wsClient } from './lib/websocket-client';
import type { TranscriptMessage, RepoContext, ToolExecution } from './types';

export function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [repoContext, setRepoContext] = useState<RepoContext>({
    active_file: 'src/hooks.ts',
    cursor: { line: 45, column: 12 },
    imports: ['React', 'useState', 'useEffect'],
    file_list: ['src/hooks.ts', 'src/utils.ts', 'tests/hooks.test.ts'],
    terminal_errors: ['ReferenceError: undefined variable at line 45'],
  });
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    // Connect to backend on mount
    const connectToBackend = async () => {
      try {
        await wsClient.connect();
        setIsConnected(true);
        console.log('[v0] Connected to LivePair backend');
      } catch (error) {
        console.error('[v0] Failed to connect:', error);
        // Retry after delay
        setTimeout(connectToBackend, 3000);
      }
    };

    connectToBackend();

    // Setup message handlers
    wsClient.onMessage('status', (data) => {
      if (data.sessionId) {
        setSessionId(data.sessionId);
        console.log('[v0] Session ID:', data.sessionId);
      }
    });

    wsClient.onMessage('transcription', (data) => {
      addTranscriptMessage('user', data.text);
    });

    wsClient.onMessage('tool_call', (data) => {
      addTranscriptMessage('tool', `Executing: ${data.tool}`);
    });

    wsClient.onMessage('response', (data) => {
      addTranscriptMessage('agent', data.text);
      setIsProcessing(false);
    });

    wsClient.onMessage('error', (data) => {
      addTranscriptMessage('error', data.error);
      setIsProcessing(false);
    });

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const addTranscriptMessage = (
    role: 'user' | 'agent' | 'tool' | 'error',
    content: string
  ) => {
    const message: TranscriptMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    setTranscript((prev) => [...prev, message]);
  };

  const handleAudioChunk = (audioData: ArrayBuffer) => {
    if (!isConnected) {
      console.warn('[v0] Not connected, cannot send audio');
      return;
    }

    setIsProcessing(true);
    wsClient.sendAudioChunk(audioData);
  };

  const handleListeningChange = (listening: boolean) => {
    setIsListening(listening);
    if (!listening) {
      // Send end of turn signal
      wsClient.sendControl({ type: 'end_of_turn' });
    }
  };

  const updateContext = () => {
    wsClient.sendContext(repoContext);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title">LivePair</div>
        <div className="status-indicator">
          <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      {/* Editor Section */}
      <div className="editor-section">
        <div className="editor-header">Code Editor</div>
        <CodeEditor />
      </div>

      {/* Transcript Section */}
      <div className="transcript-section">
        <div className="transcript-header">Transcript & Tools</div>
        <Transcript messages={transcript} />
      </div>

      {/* Audio Capture */}
      <AudioCapture
        onAudioChunk={handleAudioChunk}
        onListeningChange={handleListeningChange}
        isProcessing={isProcessing}
      />

      {/* Status Bar */}
      <StatusBar
        isConnected={isConnected}
        isListening={isListening}
        isProcessing={isProcessing}
        sessionId={sessionId}
      />
    </div>
  );
}
