import { WebSocket } from 'ws';
import type { ServerMessage } from './types.js';

/**
 * Centralized error handling for WebSocket and agent errors
 */
export class ErrorHandler {
  /**
   * Send error to client
   */
  static sendError(ws: WebSocket, error: string, details?: string): void {
    const message: ServerMessage = {
      type: 'error',
      data: {
        error,
        details: details || '',
        timestamp: new Date().toISOString(),
      },
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  static getReconnectDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, attempt - 1), 16000);
  }

  /**
   * Handle tool execution timeout
   */
  static handleToolTimeout(toolName: string): void {
    console.error(`[v0] Tool timeout: ${toolName} took too long to execute`);
  }

  /**
   * Handle patch validation failure
   */
  static handlePatchValidationFailure(
    file: string,
    reason: string
  ): string {
    return `Failed to validate patch for ${file}: ${reason}. Please check the file path and patch format.`;
  }

  /**
   * Handle Gemini API error
   */
  static handleGeminiError(error: any): string {
    if (error.status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }
    if (error.status === 401) {
      return 'Authentication failed. Check your API key.';
    }
    if (error.status === 500) {
      return 'Gemini API server error. Please try again.';
    }
    return error.message || 'Unknown Gemini API error';
  }
}
