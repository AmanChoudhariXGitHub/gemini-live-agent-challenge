import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { SessionStateManager } from './session-state-manager.js';
import { GeminiLiveSession } from './gemini-live-session.js';
import { AgentOrchestrator } from './agent-orchestrator.js';
import type { ClientMessage, ServerMessage } from './types.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Store active sessions
const activeSessions = new Map<string, {
  ws: WebSocket;
  sessionState: SessionStateManager;
  geminiSession: GeminiLiveSession | null;
  orchestrator: AgentOrchestrator | null;
}>();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  const sessionId = uuidv4();
  console.log(`[v0] New WebSocket connection: ${sessionId}`);

  const sessionState = new SessionStateManager(sessionId);
  const geminiSession = new GeminiLiveSession(sessionId);
  const orchestrator = new AgentOrchestrator(sessionState, geminiSession);

  activeSessions.set(sessionId, {
    ws,
    sessionState,
    geminiSession,
    orchestrator,
  });

  // Send session ID to client
  const welcomeMessage: ServerMessage = {
    type: 'status',
    data: {
      status: 'connected',
      sessionId,
      message: 'Connected to LivePair backend',
    },
  };
  ws.send(JSON.stringify(welcomeMessage));

  // Message handler
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;

      switch (message.type) {
        case 'audio':
          // Forward audio chunk to agent
          if (orchestrator) {
            await orchestrator.processAudioChunk(message.data);
          }
          break;

        case 'context':
          // Update repo context
          if (sessionState) {
            sessionState.updateRepoContext(message.data);
          }
          break;

        case 'control':
          // Handle control messages (end of turn, etc)
          if (message.data.type === 'end_of_turn') {
            console.log(`[v0] End of turn: ${sessionId}`);
          }
          break;

        default:
          console.log(`[v0] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[v0] Error processing message:`, error);
      const errorMessage: ServerMessage = {
        type: 'error',
        data: {
          error: 'Failed to process message',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      ws.send(JSON.stringify(errorMessage));
    }
  });

  // Error handler
  ws.on('error', (error) => {
    console.error(`[v0] WebSocket error for session ${sessionId}:`, error);
  });

  // Close handler
  ws.on('close', () => {
    console.log(`[v0] WebSocket closed: ${sessionId}`);
    activeSessions.delete(sessionId);
    
    if (geminiSession) {
      geminiSession.close();
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`[v0] LivePair backend listening on port ${PORT}`);
  console.log(`[v0] WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[v0] SIGTERM received, closing connections...');
  
  activeSessions.forEach((session) => {
    session.ws.close();
    if (session.geminiSession) {
      session.geminiSession.close();
    }
  });
  
  server.close(() => {
    console.log('[v0] Server closed');
    process.exit(0);
  });
});
