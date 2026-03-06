import * as vscode from 'vscode';

/**
 * Handles VS Code editor integration
 * Enables LivePair to read and modify code in the editor
 */
export class EditorIntegration {
  /**
   * Get current active file
   */
  getActiveFile(): {
    path: string;
    content: string;
    language: string;
  } | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    return {
      path: editor.document.fileName,
      content: editor.document.getText(),
      language: editor.document.languageId,
    };
  }

  /**
   * Read current file content
   */
  readCurrentFile(): void {
    const file = this.getActiveFile();
    if (file) {
      vscode.window.showInformationMessage(
        `Reading: ${file.path} (${file.language})`
      );
    }
  }

  /**
   * Apply patch to file
   */
  async applyPatch(data: {
    file: string;
    patch: string;
  }): Promise<boolean> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return false;
      }

      // Simple patch application (unified diff)
      const lines = editor.document.getText().split('\n');
      const patchLines = data.patch.split('\n');

      // Parse and apply patch
      let lineIndex = 0;
      let applied = false;

      for (const patchLine of patchLines) {
        if (patchLine.startsWith('-')) {
          // Remove line
          const removeText = patchLine.substring(1);
          const currentLine = lines[lineIndex];
          if (currentLine.includes(removeText)) {
            lines.splice(lineIndex, 1);
            applied = true;
          }
        } else if (patchLine.startsWith('+')) {
          // Add line
          const addText = patchLine.substring(1);
          lines.splice(lineIndex, 0, addText);
          lineIndex++;
          applied = true;
        } else if (!patchLine.startsWith('@@')) {
          lineIndex++;
        }
      }

      if (applied) {
        // Apply changes to document
        const fullRange = new vscode.Range(
          editor.document.lineAt(0).range.start,
          editor.document.lineAt(editor.document.lineCount - 1).range.end
        );

        await editor.edit((editBuilder) => {
          editBuilder.replace(fullRange, lines.join('\n'));
        });

        vscode.window.showInformationMessage('Patch applied successfully');
        return true;
      } else {
        vscode.window.showErrorMessage('Could not apply patch to file');
        return false;
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error applying patch: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Get repo context for LivePair
   */
  getRepoContext(): {
    activeFile: string;
    cursor: { line: number; column: number };
    language: string;
  } | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    return {
      activeFile: editor.document.fileName,
      cursor: {
        line: editor.selection.active.line,
        column: editor.selection.active.character,
      },
      language: editor.document.languageId,
    };
  }

  /**
   * Show diff preview
   */
  async showDiffPreview(data: { file: string; before: string; after: string }) {
    // Create temporary document with diff
    const diffContent = `
--- ${data.file}
+++ ${data.file}
@@ -1 @@
${data.before
  .split('\n')
  .map((line) => `- ${line}`)
  .join('\n')}
${data.after
  .split('\n')
  .map((line) => `+ ${line}`)
  .join('\n')}
    `;

    const doc = await vscode.workspace.openTextDocument({
      content: diffContent,
      language: 'diff',
    });

    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  }

  /**
   * Open file in editor
   */
  async openFile(filePath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      vscode.window.showErrorMessage(`Cannot open file: ${filePath}`);
    }
  }

  /**
   * Insert snippet at cursor
   */
  async insertSnippet(snippet: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    await editor.insertSnippet(new vscode.SnippetString(snippet));
  }
}
