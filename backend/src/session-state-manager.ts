import type {
  SessionState,
  ConversationMessage,
  FileEdit,
  ToolCall,
  RepoState,
  RepoContext,
} from './types.js';

/**
 * Manages session state including conversation memory, recent edits, and repo context.
 * This enables agent continuity and understanding of session history.
 */
export class SessionStateManager {
  private state: SessionState;
  private maxConversationMemory = 10;
  private maxToolHistory = 5;

  constructor(sessionId: string) {
    this.state = {
      sessionId,
      conversationMemory: [],
      recentEdits: [],
      toolHistory: [],
      repoState: {
        activeFile: '',
        cursorPosition: { line: 0, column: 0 },
        imports: [],
        fileList: [],
        terminalErrors: [],
      },
      createdAt: new Date(),
      lastActivity: new Date(),
    };
  }

  /**
   * Add a message to conversation memory (user or agent)
   */
  addConversationMessage(role: 'user' | 'agent', content: string): void {
    this.state.conversationMemory.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Keep only recent messages
    if (this.state.conversationMemory.length > this.maxConversationMemory) {
      this.state.conversationMemory = this.state.conversationMemory.slice(
        -this.maxConversationMemory
      );
    }

    this.updateLastActivity();
  }

  /**
   * Record a tool execution
   */
  recordToolCall(
    tool: string,
    args: Record<string, any>,
    result: any,
    success: boolean
  ): void {
    this.state.toolHistory.push({
      tool: tool as any,
      arguments: args,
      result,
      timestamp: new Date(),
      success,
    });

    // Keep only recent tool calls
    if (this.state.toolHistory.length > this.maxToolHistory) {
      this.state.toolHistory = this.state.toolHistory.slice(
        -this.maxToolHistory
      );
    }

    // Track file edits
    if (tool === 'apply_patch' && success && args.file) {
      this.state.recentEdits.push({
        file: args.file,
        timestamp: new Date(),
        action: 'modified',
      });
    }

    this.updateLastActivity();
  }

  /**
   * Update repo context from client
   */
  updateRepoContext(context: RepoContext): void {
    this.state.repoState.activeFile = context.active_file || '';
    this.state.repoState.cursorPosition = context.cursor || {
      line: 0,
      column: 0,
    };
    this.state.repoState.imports = context.imports || [];
    this.state.repoState.fileList = context.file_list || [];
    this.state.repoState.terminalErrors = context.terminal_errors || [];

    this.updateLastActivity();
  }

  /**
   * Get formatted context string for agent prompt
   */
  getContextString(): string {
    const lines: string[] = [];

    // Recent conversation context
    if (this.state.conversationMemory.length > 0) {
      lines.push('## Recent Conversation');
      const recentConversation = this.state.conversationMemory.slice(-3);
      recentConversation.forEach((msg) => {
        lines.push(
          `- ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}`
        );
      });
    }

    // Recent edits
    if (this.state.recentEdits.length > 0) {
      lines.push('\n## Recent Edits');
      this.state.recentEdits.slice(-3).forEach((edit) => {
        lines.push(`- ${edit.action}: ${edit.file}`);
      });
    }

    // Tool history
    if (this.state.toolHistory.length > 0) {
      lines.push('\n## Recent Tool Calls');
      this.state.toolHistory.slice(-2).forEach((call) => {
        const status = call.success ? 'SUCCESS' : 'FAILED';
        lines.push(`- ${call.tool} [${status}]`);
      });
    }

    // Active file context
    if (this.state.repoState.activeFile) {
      lines.push('\n## Current Context');
      lines.push(`- Active file: ${this.state.repoState.activeFile}`);
      lines.push(
        `- Cursor: line ${this.state.repoState.cursorPosition.line}, column ${this.state.repoState.cursorPosition.column}`
      );

      if (this.state.repoState.imports.length > 0) {
        lines.push(`- Imports: ${this.state.repoState.imports.join(', ')}`);
      }

      if (this.state.repoState.terminalErrors.length > 0) {
        lines.push('\n## Recent Errors');
        this.state.repoState.terminalErrors.forEach((error) => {
          lines.push(`- ${error}`);
        });
      }
    }

    return lines.join('\n');
  }

  /**
   * Get full session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    this.state.lastActivity = new Date();
  }

  /**
   * Reset session state
   */
  reset(): void {
    this.state.conversationMemory = [];
    this.state.recentEdits = [];
    this.state.toolHistory = [];
    this.state.repoState = {
      activeFile: '',
      cursorPosition: { line: 0, column: 0 },
      imports: [],
      fileList: [],
      terminalErrors: [],
    };
    this.updateLastActivity();
  }
}
