// Session State Types
export interface SessionState {
  sessionId: string;
  conversationMemory: ConversationMessage[];
  recentEdits: FileEdit[];
  toolHistory: ToolCall[];
  repoState: RepoState;
  createdAt: Date;
  lastActivity: Date;
}

export interface ConversationMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface FileEdit {
  file: string;
  timestamp: Date;
  action: 'read' | 'modified' | 'created';
}

export interface ToolCall {
  tool: ToolName;
  arguments: Record<string, any>;
  result: any;
  timestamp: Date;
  success: boolean;
}

export type ToolName = 'read_file' | 'search_repo' | 'apply_patch' | 'run_tests';

export interface RepoState {
  activeFile: string;
  cursorPosition: { line: number; column: number };
  imports: string[];
  fileList: string[];
  terminalErrors: string[];
}

// Context Types
export interface RepoContext {
  active_file: string;
  cursor: { line: number; column: number };
  imports: string[];
  file_list: string[];
  terminal_errors: string[];
}

// MCP Tool Types
export interface ToolRequest {
  tool: ToolName;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

// Gemini Live Types
export interface AudioMessage {
  type: 'audio';
  data: ArrayBuffer;
}

export interface ControlMessage {
  type: 'control';
  data: {
    type: 'end_of_turn';
  };
}

export interface GeminiMessage {
  type: 'content' | 'setup' | 'server_content';
  text?: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
}

// Structured Action Schema
export interface StructuredAction {
  tool: ToolName;
  arguments: Record<string, any>;
  reasoning: string;
}

// Agent Output
export interface AgentOutput {
  text: string;
  action?: StructuredAction;
}

// WebSocket Message Types
export interface ClientMessage {
  type: 'audio' | 'context' | 'control';
  data: any;
}

export interface ServerMessage {
  type: 'transcription' | 'tool_call' | 'response' | 'error' | 'status';
  data: any;
}
