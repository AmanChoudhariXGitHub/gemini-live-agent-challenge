import type { ClientMessage, ServerMessage } from '../types.js';

/**
 * WebSocket client for connecting to LivePair backend
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isConnecting = false;

  constructor(url: string = 'ws://localhost:8080') {
    this.url = url;
  }

  /**
   * Connect to backend
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[v0] WebSocket connected to backend');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data) as ServerMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('[v0] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error: Event) => {
          console.error('[v0] WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[v0] WebSocket disconnected');
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Send audio chunk to backend (16-bit PCM, 16kHz)
   */
  sendAudioChunk(audioData: ArrayBuffer): void {
    if (!this.isReady()) {
      console.warn('[v0] WebSocket not ready, cannot send audio');
      return;
    }

    const message: ClientMessage = {
      type: 'audio',
      data: Array.from(new Uint8Array(audioData)),
    };

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Send repo context to backend
   */
  sendContext(context: any): void {
    if (!this.isReady()) {
      console.warn('[v0] WebSocket not ready, cannot send context');
      return;
    }

    const message: ClientMessage = {
      type: 'context',
      data: context,
    };

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Send control message (end of turn, etc)
   */
  sendControl(control: any): void {
    if (!this.isReady()) {
      return;
    }

    const message: ClientMessage = {
      type: 'control',
      data: control,
    };

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Handle incoming server message
   */
  private handleMessage(message: ServerMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    } else {
      console.log('[v0] No handler for message type:', message.type);
    }
  }

  /**
   * Check if WebSocket is ready
   */
  isReady(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        '[v0] Max reconnection attempts reached, giving up'
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `[v0] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) after ${delay}ms`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[v0] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();
