import React, { useEffect, useState } from 'react';
import { AudioProcessor } from '../lib/audio-processor';

interface AudioCaptureProps {
  onAudioChunk: (data: ArrayBuffer) => void;
  onListeningChange: (listening: boolean) => void;
  isProcessing: boolean;
}

export function AudioCapture({
  onAudioChunk,
  onListeningChange,
  isProcessing,
}: AudioCaptureProps) {
  const [isListening, setIsListening] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(
    Array(10).fill(0)
  );
  const [audioProcessor, setAudioProcessor] = useState<AudioProcessor | null>(
    null
  );
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize audio processor
    const processor = new AudioProcessor();

    processor.onChunk(onAudioChunk);
    processor.onWaveformUpdate(setWaveformLevels);

    processor
      .initialize()
      .then(() => {
        setAudioProcessor(processor);
        // Auto-start listening
        processor.start();
        setIsListening(true);
        onListeningChange(true);
      })
      .catch((err) => {
        setError('Failed to access microphone');
        console.error(err);
      });

    return () => {
      processor.cleanup();
    };
  }, [onAudioChunk, onListeningChange]);

  const handleToggle = () => {
    if (!audioProcessor) return;

    if (isListening) {
      audioProcessor.stop();
      setIsListening(false);
      onListeningChange(false);
    } else {
      audioProcessor.start();
      setIsListening(true);
      onListeningChange(true);
    }
  };

  if (error) {
    return (
      <div className="audio-visualizer" style={{ background: 'rgba(248, 81, 73, 0.1)' }}>
        <span style={{ color: '#f85149', fontSize: '12px' }}>{error}</span>
      </div>
    );
  }

  return (
    <div className="audio-visualizer">
      {waveformLevels.map((level, index) => (
        <div
          key={index}
          className="audio-bar"
          style={{
            height: `${Math.max(8, level)}px`,
            opacity: isListening && !isProcessing ? 1 : 0.3,
          }}
        />
      ))}
      <button
        onClick={handleToggle}
        style={{
          marginLeft: '12px',
          padding: '6px 12px',
          background: isListening ? '#58a6ff' : '#30363d',
          color: '#e6edf3',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        {isListening ? 'Listening' : 'Start'}
      </button>
    </div>
  );
}
