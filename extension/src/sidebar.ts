import * as vscode from 'vscode';
import path from 'path';
import { EditorIntegration } from './editor-integration';

/**
 * Manages the LivePair sidebar WebView panel
 */
export class LivePairPanel {
  private panel: vscode.WebviewPanel;
  private editorIntegration: EditorIntegration;
  private isListening = false;

  constructor(
    extensionUri: vscode.Uri,
    editorIntegration: EditorIntegration
  ) {
    this.editorIntegration = editorIntegration;

    // Create WebView panel
    this.panel = vscode.window.createWebviewPanel(
      'livepair',
      'LivePair',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    // Set HTML content
    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from WebView
    this.panel.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });
  }

  /**
   * Handle messages from WebView
   */
  private handleMessage(message: any) {
    switch (message.command) {
      case 'applyPatch':
        this.editorIntegration.applyPatch(message.data);
        break;

      case 'readFile':
        this.editorIntegration.readCurrentFile();
        break;

      case 'log':
        console.log('[LivePair]', message.text);
        break;
    }
  }

  /**
   * Toggle listening state
   */
  toggleListening() {
    this.isListening = !this.isListening;
    this.panel.webview.postMessage({
      command: 'toggleListening',
      value: this.isListening,
    });
  }

  /**
   * Send message to WebView
   */
  sendMessage(message: any) {
    this.panel.webview.postMessage(message);
  }

  /**
   * Get WebView HTML content
   */
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 16px;
            color: #e6edf3;
            background: #0d1117;
          }
          
          h1 {
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
          }
          
          .status {
            padding: 8px 12px;
            border-radius: 4px;
            background: #161b22;
            margin-bottom: 16px;
            font-size: 13px;
          }
          
          .status.connected {
            background: rgba(63, 185, 80, 0.1);
            color: #3fb950;
          }
          
          .status.listening {
            background: rgba(88, 166, 255, 0.1);
            color: #58a6ff;
          }
          
          button {
            padding: 8px 16px;
            background: #58a6ff;
            color: #0d1117;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            width: 100%;
            margin-bottom: 8px;
          }
          
          button:hover {
            background: #79c0ff;
          }
          
          .info {
            background: #161b22;
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            line-height: 1.5;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <h1>LivePair</h1>
        
        <div class="status connected">
          Connected to VS Code
        </div>
        
        <button onclick="toggleListening()">Start Listening</button>
        
        <div class="info">
          <p><strong>Quick Start:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Click "Start Listening" to enable voice input</li>
            <li>Speak to ask questions about your code</li>
            <li>Agent will suggest patches and modifications</li>
            <li>Use Ctrl+Alt+P to toggle listening quickly</li>
          </ul>
        </div>
        
        <div class="info">
          <p><strong>Note:</strong> This is a proof-of-concept integration showing how LivePair can extend VS Code. For full functionality, use the web app at your backend URL.</p>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function toggleListening() {
            vscode.postMessage({ command: 'toggleListening' });
          }
          
          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.command === 'toggleListening') {
              const btn = document.querySelector('button');
              btn.textContent = message.value ? 'Listening...' : 'Start Listening';
              btn.style.background = message.value ? '#58a6ff' : '#30363d';
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Reveal panel
   */
  reveal() {
    this.panel.reveal(vscode.ViewColumn.Beside);
  }

  /**
   * Dispose panel
   */
  dispose() {
    this.panel.dispose();
  }
}
