# LivePair VS Code Extension

A VS Code extension for the LivePair voice pair programmer. This is a proof-of-concept integration that demonstrates how LivePair can be extended into VS Code as a native editor plugin.

**Status:** Scaffold/Proof of Concept - Full integration requires additional development

## Features (Planned)

- **Voice Input**: Stream audio directly from VS Code
- **Real-time Suggestions**: Get code suggestions through VS Code's IntelliSense
- **Patch Preview**: Review suggested code changes before applying
- **File Integration**: Seamless read/write of files in the current workspace
- **Terminal Awareness**: See and respond to compilation errors in VS Code's terminal

## Installation

### From Source

```bash
cd extension

# Install dependencies
npm install

# Build
npm run esbuild

# Package as .vsix
npm run package
```

Then install the `.vsix` file in VS Code:
- Open VS Code
- Press `Ctrl+P` (or `Cmd+P` on Mac)
- Type `ext install` and select the `.vsix` file

### Development Mode

```bash
# Watch for changes
npm run esbuild-watch

# Open in debug mode
Press F5 in VS Code to launch the debug environment
```

## Configuration

Add to your VS Code `settings.json`:

```json
{
  "livepair.backendUrl": "wss://your-backend-url.run.app",
  "livepair.autoStart": true
}
```

## Usage

1. **Start LivePair**: Run command `LivePair: Start Session` (or use `Ctrl+Alt+P`)
2. **Toggle Listening**: Press `Ctrl+Alt+P` to enable/disable voice input
3. **View Suggestions**: Agent responses appear in the sidebar
4. **Apply Changes**: Review patches before applying to your code

## Architecture

```
VS Code
├── Extension Host (Node.js)
│   ├── extension.ts (main entry point)
│   ├── sidebar.ts (WebView UI)
│   └── editor-integration.ts (file/code operations)
└── WebView (HTML/CSS/JS for sidebar UI)
    └── Communicates with VS Code via postMessage API
```

### Message Flow

```
Editor Changes
    ↓
EditorIntegration.getRepoContext()
    ↓
Send to LivePair Backend (WebSocket)
    ↓
Agent processes + suggests patches
    ↓
Patch received in Sidebar WebView
    ↓
User reviews and applies via EditorIntegration.applyPatch()
```

## Development Roadmap

### Phase 1: MVP (Current)
- ✅ Extension scaffold with commands
- ✅ Sidebar webview panel
- ✅ Basic editor integration
- ⏳ WebSocket connection to backend (in progress)

### Phase 2: Integration
- [ ] Real-time file reading/writing
- [ ] Patch preview and application
- [ ] Error context from terminal
- [ ] IntelliSense suggestions

### Phase 3: Enhancement
- [ ] Custom hotkeys for common operations
- [ ] Theme customization
- [ ] Multi-file refactoring
- [ ] Git integration for reviewing changes

## Debugging

### Enable Debug Logs

In `extension.ts`, change:
```typescript
console.log('[v0] ...')  // Shows in "Output" panel
```

View logs in VS Code Output panel → "LivePair" channel.

### Debug the Extension

1. Open extension folder in VS Code
2. Press `F5` to launch debug session
3. A new VS Code window opens with the extension loaded
4. Set breakpoints in TypeScript code
5. Trigger extension commands to debug

## Project Structure

```
extension/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── sidebar.ts                # Sidebar panel and UI
│   └── editor-integration.ts      # VS Code editor API integration
├── dist/
│   └── extension.js              # Compiled output (created by esbuild)
├── package.json
├── tsconfig.json
└── README.md
```

## Key Dependencies

- **vscode**: Official VS Code extension API
- **ws**: WebSocket client for communicating with LivePair backend
- **esbuild**: Fast bundler for extension code

## Publishing to VS Code Marketplace

Once fully functional:

```bash
# Generate personal access token at https://dev.azure.com/

# Publish
vsce publish -p <token>
```

See [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Security Considerations

- Backend URL is stored in user settings
- Recommend using HTTPS/WSS only
- Consider adding authentication token for production

## Known Limitations

### Current Scaffold
- WebSocket connection not fully implemented
- Patch application is simplified (unified diff only)
- No error recovery or reconnection logic
- Sidebar UI is minimal proof-of-concept

### To Enable Full Functionality
- Integrate with WebSocket client from `frontend/src/lib/websocket-client.ts`
- Enhance patch parser to handle more complex diffs
- Add audio capture capabilities
- Implement file system operations

## Contributing

This is a proof-of-concept for the hackathon. Full development contributions welcome!

## License

MIT

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Generator](https://code.visualstudio.com/api/get-started/your-first-extension)
- [WebView API](https://code.visualstudio.com/api/extension-guides/webview)
- [LivePair Backend API Documentation](../README.md)
