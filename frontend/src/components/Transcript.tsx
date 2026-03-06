import React, { useEffect, useRef } from 'react';
import type { TranscriptMessage } from '../types';

interface TranscriptProps {
  messages: TranscriptMessage[];
}

export function Transcript({ messages }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="transcript-content" ref={containerRef}>
      {messages.length === 0 && (
        <div
          style={{
            color: '#8b949e',
            fontSize: '13px',
            textAlign: 'center',
            marginTop: '32px',
            opacity: 0.6,
          }}
        >
          Start speaking to begin the conversation...
        </div>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`message ${msg.role}`}
          style={{
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {msg.role === 'tool' && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                opacity: 0.7,
                marginBottom: '4px',
              }}
            >
              {msg.content}
            </div>
          )}
          {msg.role !== 'tool' && <span>{msg.content}</span>}
          <div
            style={{
              fontSize: '11px',
              opacity: 0.5,
              marginTop: '4px',
            }}
          >
            {msg.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
