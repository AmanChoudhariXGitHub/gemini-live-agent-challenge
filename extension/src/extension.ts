import * as vscode from 'vscode';
import { LivePairPanel } from './sidebar';
import { EditorIntegration } from './editor-integration';

let context: vscode.ExtensionContext;
let panel: LivePairPanel | undefined;
let editorIntegration: EditorIntegration;

/**
 * Activate extension
 */
export function activate(extensionContext: vscode.ExtensionContext) {
  context = extensionContext;
  editorIntegration = new EditorIntegration();

  console.log('[v0] LivePair extension activating...');

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('livepair.start', async () => {
      startSession();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('livepair.stop', async () => {
      stopSession();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('livepair.toggleListening', async () => {
      if (panel) {
        panel.toggleListening();
      }
    })
  );

  // Show welcome message
  vscode.window.showInformationMessage(
    'LivePair activated! Use Ctrl+Alt+P to start coding with voice.'
  );

  console.log('[v0] LivePair extension activated');
}

/**
 * Start LivePair session
 */
function startSession() {
  if (panel) {
    panel.reveal();
    return;
  }

  // Create sidebar panel
  panel = new LivePairPanel(context.extensionUri, editorIntegration);

  panel.onDidDispose(() => {
    panel = undefined;
  });

  vscode.window.showInformationMessage('LivePair session started');
}

/**
 * Stop LivePair session
 */
function stopSession() {
  if (panel) {
    panel.dispose();
    panel = undefined;
    vscode.window.showInformationMessage('LivePair session stopped');
  }
}

/**
 * Deactivate extension
 */
export function deactivate() {
  console.log('[v0] LivePair extension deactivating...');
  if (panel) {
    panel.dispose();
  }
}
