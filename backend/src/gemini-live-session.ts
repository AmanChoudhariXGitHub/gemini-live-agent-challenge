import WebSocket from 'ws';

/**
 * Wrapper for Gemini Live API WebSocket connection.
 * Manages server-to-server communication with Google's Gemini Live API.
 * 
 * Reference: https://ai.google.dev/gemini-api/docs/live?example=mic-stream
 */
export class GeminiLiveSession {
  private sessionId: string;
  private ws: WebSocket | null = null;
  private apiKey: string;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1s, exponential backoff
  private responseCallbacks: Map<
    string,
    (data: any) => void
  > = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.apiKey = process.env.GOOGLE_API_KEY || '';

    if (!this.apiKey) {
      console.error('[v0] GOOGLE_API_KEY environment variable not set');
    }
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `wss://generativelanguage.googleapis.com/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
          console.log(`[v0] Gemini Live connected for session ${this.sessionId}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send setup message
          this.sendSetup();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleGeminiMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          console.error(
            `[v0] Gemini Live error for session ${this.sessionId}:`,
            error
          );
          this.isConnected = false;
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        this.ws.on('close', () => {
          console.log(
            `[v0] Gemini Live closed for session ${this.sessionId}`
          );
          this.isConnected = false;
          this.attemptReconnect();
        });
      } catch (error) {
        console.error(`[v0] Failed to connect to Gemini Live:`, error);
        reject(error);
      }
    });
  }

  /**
   * Send setup message to Gemini Live
   */
  private sendSetup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const setupMessage = {
      setup: {
        model: 'models/gemini-2.0-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
        systemInstruction: {
          parts: [
            {
              text: `You are LivePair, a real-time voice pair programmer. Your role is to help developers write, understand, and debug code through natural conversation.

When responding:
1. Always format tool calls as JSON in this exact structure:
{
  "tool": "tool_name",
  "arguments": { "key": "value" },
  "reasoning": "explanation"
}

2. Available tools: read_file, search_repo, apply_patch, run_tests

3. Before modifying code, always:
   - Read the current file
   - Understand the context
   - Generate a well-formed patch
   - Explain your reasoning

4. Keep responses concise and actionable.

5. Understand the repo context provided in each message and use it to give relevant suggestions.`,
            },
          ],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Send audio chunk to Gemini Live (16-bit PCM, 16kHz)
   */
  sendAudioChunk(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        `[v0] Cannot send audio: WebSocket not connected (state: ${this.ws?.readyState})`
      );
      return;
    }

    const audioMessage = {
      realtimeInput: {
        mediaStream: {
          mimeType: 'audio/pcm',
          data: Buffer.from(audioData).toString('base64'),
        },
      },
    };

    this.ws.send(JSON.stringify(audioMessage));
  }

  /**
   * Send text message to Gemini Live
   */
  sendTextMessage(text: string, contextString?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[v0] Cannot send text: WebSocket not connected');
      return;
    }

    const fullText = contextString
      ? `${contextString}\n\nUser: ${text}`
      : text;

    const textMessage = {
      realtime_input: {
        media_stream: {
          mime_type: 'text/plain',
          text: fullText,
        },
      },
    };

    this.ws.send(JSON.stringify(textMessage));
  }

  /**
   * Send end of turn signal
   */
  sendEndOfTurn(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const endMessage = {
      clientContent: {
        turns: [
          {
            role: 'user',
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(endMessage));
  }

  /**
   * Handle message from Gemini Live
   */
  private handleGeminiMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
      // Extract server content
      if (message.serverContent) {
        const content = message.serverContent;
        
        // Handle different content types
        if (content.modelTurn?.parts) {
          content.modelTurn.parts.forEach((part: any) => {
            if (part.text) {
              console.log('[v0] Gemini response:', part.text);
            }
          });
        }
      }

      // Notify listeners
      this.responseCallbacks.forEach((callback) => {
        callback(message);
      });
    } catch (error) {
      console.error('[v0] Error parsing Gemini message:', error);
    }
  }

  /**
   * Register callback for responses
   */
  onResponse(callback: (data: any) => void): void {
    const callbackId = Math.random().toString();
    this.responseCallbacks.set(callbackId, callback);
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[v0] Max reconnection attempts reached for session ${this.sessionId}`
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
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
