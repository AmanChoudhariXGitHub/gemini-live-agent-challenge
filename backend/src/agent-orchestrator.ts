import { SessionStateManager } from './session-state-manager.js';
import { GeminiLiveSession } from './gemini-live-session.js';
import { MCPToolExecutor } from './mcp-tool-executor.js';
import { GroundingLayer } from './grounding-layer.js';
import type { StructuredAction, ServerMessage } from './types.js';

/**
 * Orchestrates the agent loop: audio -> Gemini -> structured output -> tool execution -> response
 */
export class AgentOrchestrator {
  private sessionState: SessionStateManager;
  private geminiSession: GeminiLiveSession;
  private toolExecutor: MCPToolExecutor;
  private groundingLayer: GroundingLayer;
  private processingAudio = false;
  private responseBuffer = '';

  constructor(
    sessionState: SessionStateManager,
    geminiSession: GeminiLiveSession
  ) {
    this.sessionState = sessionState;
    this.geminiSession = geminiSession;
    this.toolExecutor = new MCPToolExecutor();
    this.groundingLayer = new GroundingLayer();

    // Setup Gemini response handler
    geminiSession.onResponse((data) => {
      this.handleGeminiResponse(data);
    });
  }

  /**
   * Process incoming audio chunk from client
   */
  async processAudioChunk(audioData: ArrayBuffer): Promise<void> {
    if (!this.geminiSession.isReady()) {
      console.log('[v0] Initializing Gemini Live connection...');
      try {
        await this.geminiSession.connect();
      } catch (error) {
        console.error('[v0] Failed to connect to Gemini Live:', error);
        return;
      }
    }

    this.processingAudio = true;
    this.responseBuffer = '';

    // Get current session context
    const contextString = this.sessionState.getContextString();

    // Send audio and context to Gemini
    this.geminiSession.sendAudioChunk(audioData);

    // Send context as text message
    if (contextString) {
      this.geminiSession.sendTextMessage(
        'Please help with the code.',
        contextString
      );
    }
  }

  /**
   * Handle response from Gemini Live
   */
  private async handleGeminiResponse(data: any): Promise<void> {
    try {
      // Extract text from Gemini response
      if (data.serverContent?.modelTurn?.parts) {
        const parts = data.serverContent.modelTurn.parts;

        for (const part of parts) {
          if (part.text) {
            this.responseBuffer += part.text;

            // Try to parse structured action
            const action = this.parseStructuredAction(this.responseBuffer);

            if (action) {
              console.log('[v0] Parsed structured action:', action);

              // Execute tool with grounding layer
              const result = await this.groundingLayer.validateAndExecute(
                action,
                this.toolExecutor
              );

              // Record tool call in session
              this.sessionState.recordToolCall(
                action.tool,
                action.arguments,
                result,
                result.success
              );

              // Add to conversation memory
              this.sessionState.addConversationMessage(
                'agent',
                `Executed ${action.tool}: ${result.success ? 'success' : 'failed'}`
              );
            }
          }
        }
      }

      // Check for end of response
      if (data.serverContent?.turnComplete) {
        console.log('[v0] Turn complete');
        this.processingAudio = false;
        this.responseBuffer = '';
      }
    } catch (error) {
      console.error('[v0] Error handling Gemini response:', error);
    }
  }

  /**
   * Parse structured action from response
   */
  private parseStructuredAction(text: string): StructuredAction | null {
    try {
      // Look for JSON object with tool, arguments, reasoning
      const jsonMatch = text.match(/\{[\s\S]*?"tool"[\s\S]*?\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (
          parsed.tool &&
          parsed.arguments &&
          ['read_file', 'search_repo', 'apply_patch', 'run_tests'].includes(
            parsed.tool
          )
        ) {
          return {
            tool: parsed.tool,
            arguments: parsed.arguments,
            reasoning: parsed.reasoning || '',
          };
        }
      }
    } catch (error) {
      console.log('[v0] Could not parse structured action from response');
    }

    return null;
  }

  /**
   * Check if currently processing
   */
  isProcessing(): boolean {
    return this.processingAudio;
  }
}
