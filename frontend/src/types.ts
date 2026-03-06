// Message Types
export interface ClientMessage {
  type: 'audio' | 'context' | 'control';
  data: any;
}

export interface ServerMessage {
  type: 'transcription' | 'tool_call' | 'response' | 'error' | 'status';
  data: any;
}

// Context Types
export interface RepoContext {
  active_file: string;
  cursor: { line: number; column: number };
  imports: string[];
  file_list: string[];
  terminal_errors: string[];
}

// Transcript Types
export interface TranscriptMessage {
  role: 'user' | 'agent' | 'tool' | 'error';
  content: string;
  timestamp: Date;
}

// Tool Types
export interface ToolExecution {
  tool: string;
  arguments: Record<string, any>;
  result?: any;
  success: boolean;
  timestamp: Date;
}

// Editor Types
export interface EditorState {
  content: string;
  language: string;
  cursorPosition: { line: number; column: number };
}

// Diff Types
export interface FileDiff {
  file: string;
  before: string;
  after: string;
  patch: string;
}
