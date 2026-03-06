/**
 * Audio processor: Captures continuous 16kHz PCM audio and applies silence detection
 */
export class AudioProcessor {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private silenceThreshold = -40; // dB
  private isListening = false;
  private onAudioChunk: ((data: ArrayBuffer) => void) | null = null;
  private onWaveform: ((levels: number[]) => void) | null = null;

  /**
   * Initialize audio capture
   */
  async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Create audio context with 16kHz sample rate
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for continuous audio
      this.scriptProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        this.processAudio(event);
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      console.log('[v0] Audio processor initialized at 16kHz');
    } catch (error) {
      console.error('[v0] Failed to initialize audio:', error);
      throw error;
    }
  }

  /**
   * Start listening
   */
  start(): void {
    if (!this.audioContext) {
      console.error('[v0] Audio context not initialized');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isListening = true;
    console.log('[v0] Audio capture started');
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.isListening = false;
    console.log('[v0] Audio capture stopped');
  }

  /**
   * Process audio chunk
   */
  private processAudio(event: AudioProcessingEvent): void {
    if (!this.isListening) {
      return;
    }

    const inputData = event.inputBuffer.getChannelData(0);

    // Check silence
    if (this.isSilent(inputData)) {
      return;
    }

    // Convert float32 to int16 PCM
    const pcmData = this.floatTo16BitPCM(inputData);

    // Send to callback
    if (this.onAudioChunk) {
      this.onAudioChunk(pcmData);
    }

    // Calculate and send waveform levels
    if (this.onWaveform) {
      const levels = this.calculateWaveformLevels(inputData);
      this.onWaveform(levels);
    }
  }

  /**
   * Check if audio is silent using RMS
   */
  private isSilent(data: Float32Array): boolean {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }

    const rms = Math.sqrt(sum / data.length);
    const db = 20 * Math.log10(Math.abs(rms) + 1e-10);

    return db < this.silenceThreshold;
  }

  /**
   * Convert float32 to 16-bit PCM
   */
  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new Int16Array(buffer);

    for (let i = 0; i < input.length; i++) {
      // Clamp to [-1, 1]
      const s = Math.max(-1, Math.min(1, input[i]));
      // Convert to 16-bit integer
      view[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return buffer;
  }

  /**
   * Calculate waveform levels for visualization
   */
  private calculateWaveformLevels(data: Float32Array, bars: number = 10): number[] {
    const levels: number[] = [];
    const samplesPerBar = Math.floor(data.length / bars);

    for (let i = 0; i < bars; i++) {
      const start = i * samplesPerBar;
      const end = start + samplesPerBar;
      const slice = data.slice(start, end);

      let sum = 0;
      for (let j = 0; j < slice.length; j++) {
        sum += Math.abs(slice[j]);
      }

      const average = sum / slice.length;
      levels.push(Math.min(100, average * 500)); // Scale to 0-100
    }

    return levels;
  }

  /**
   * Register audio chunk callback
   */
  onChunk(callback: (data: ArrayBuffer) => void): void {
    this.onAudioChunk = callback;
  }

  /**
   * Register waveform callback
   */
  onWaveformUpdate(callback: (levels: number[]) => void): void {
    this.onWaveform = callback;
  }

  /**
   * Set silence threshold
   */
  setSilenceThreshold(db: number): void {
    this.silenceThreshold = db;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stop();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.mediaStream = null;
    this.audioContext = null;
    this.scriptProcessor = null;
  }
}
