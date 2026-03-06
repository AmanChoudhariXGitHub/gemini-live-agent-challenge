import type { SessionState } from './types.js';

/**
 * Handles session recovery and error recovery
 */
export class RecoveryHandler {
  private sessionSnapshots: Map<string, SessionState> = new Map();
  private maxSnapshots = 5;

  /**
   * Create session checkpoint
   */
  saveCheckpoint(sessionId: string, state: SessionState): void {
    this.sessionSnapshots.set(sessionId, JSON.parse(JSON.stringify(state)));

    // Keep only recent snapshots
    if (this.sessionSnapshots.size > this.maxSnapshots) {
      const oldestKey = Array.from(this.sessionSnapshots.keys())[0];
      this.sessionSnapshots.delete(oldestKey);
    }
  }

  /**
   * Recover session from checkpoint
   */
  recoverSession(sessionId: string): SessionState | null {
    return this.sessionSnapshots.get(sessionId) || null;
  }

  /**
   * Clear checkpoint
   */
  clearCheckpoint(sessionId: string): void {
    this.sessionSnapshots.delete(sessionId);
  }

  /**
   * Handle WebSocket reconnection
   */
  static handleReconnection(
    sessionId: string,
    attemptNumber: number
  ): {
    shouldRetry: boolean;
    delayMs: number;
    message: string;
  } {
    if (attemptNumber > 5) {
      return {
        shouldRetry: false,
        delayMs: 0,
        message: 'Max reconnection attempts reached',
      };
    }

    const delayMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 16000);

    return {
      shouldRetry: true,
      delayMs,
      message: `Reconnecting... (attempt ${attemptNumber}/5, delay: ${delayMs}ms)`,
    };
  }

  /**
   * Handle tool execution timeout
   */
  static handleToolTimeout(
    toolName: string,
    timeoutMs: number
  ): {
    retry: boolean;
    fallback: string;
  } {
    console.error(`[v0] Tool timeout: ${toolName} exceeded ${timeoutMs}ms`);

    return {
      retry: true,
      fallback: `Tool execution timed out after ${timeoutMs}ms. Please try again.`,
    };
  }

  /**
   * Handle Gemini API errors
   */
  static handleGeminiError(error: any): {
    recoverable: boolean;
    message: string;
    action: 'retry' | 'reconnect' | 'fallback';
  } {
    const status = error.status || error.code;

    // Rate limit - recoverable
    if (status === 429) {
      return {
        recoverable: true,
        message: 'Rate limited, retrying after delay',
        action: 'retry',
      };
    }

    // Auth error - not recoverable without new credentials
    if (status === 401 || status === 403) {
      return {
        recoverable: false,
        message: 'Authentication failed. Check API key.',
        action: 'fallback',
      };
    }

    // Server error - recoverable
    if (status === 500 || status === 503) {
      return {
        recoverable: true,
        message: 'Gemini service error, reconnecting',
        action: 'reconnect',
      };
    }

    // Unknown error - try to recover
    return {
      recoverable: true,
      message: error.message || 'Unknown error occurred',
      action: 'retry',
    };
  }

  /**
   * Generate recovery response for client
   */
  static generateRecoveryResponse(error: string, context: string): string {
    return `Recovery attempt in progress: ${error}. Context: ${context}`;
  }
}
