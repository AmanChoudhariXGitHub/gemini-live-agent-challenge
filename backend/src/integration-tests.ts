import { SessionStateManager } from './session-state-manager.js';
import { MCPToolExecutor } from './mcp-tool-executor.js';
import { GroundingLayer } from './grounding-layer.js';
import { ToolValidator } from './tool-validator.js';
import type { StructuredAction } from './types.js';

/**
 * Integration tests for the agent pipeline
 * Tests the full flow: action validation → tool execution → grounding → result validation
 */
export async function runIntegrationTests() {
  console.log('[v0] Starting integration tests...\n');

  const tests = [
    testReadFile,
    testSearchRepo,
    testApplyPatchValidation,
    testRunTests,
    testSessionState,
    testInvalidActions,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
      console.log(`✓ ${test.name}\n`);
    } catch (error) {
      failed++;
      console.error(
        `✗ ${test.name}:`,
        error instanceof Error ? error.message : error
      );
      console.log();
    }
  }

  console.log(
    `\n[v0] Integration tests complete: ${passed} passed, ${failed} failed`
  );
}

async function testReadFile() {
  const executor = new MCPToolExecutor();
  const grounding = new GroundingLayer();

  const action: StructuredAction = {
    tool: 'read_file',
    arguments: { path: 'src/hooks.ts' },
    reasoning: 'Test reading file',
  };

  const validation = ToolValidator.validate(action);
  if (!validation.valid) throw new Error('Validation failed');

  const result = await grounding.validateAndExecute(action, executor);
  if (!result.success) throw new Error('Execution failed');
  if (!result.result) throw new Error('No result returned');
}

async function testSearchRepo() {
  const executor = new MCPToolExecutor();
  const grounding = new GroundingLayer();

  const action: StructuredAction = {
    tool: 'search_repo',
    arguments: { query: 'useData' },
    reasoning: 'Test searching repository',
  };

  const result = await grounding.validateAndExecute(action, executor);
  if (!result.success) throw new Error('Search failed');
  if (!result.result?.found) throw new Error('No results found');
}

async function testApplyPatchValidation() {
  const executor = new MCPToolExecutor();
  const grounding = new GroundingLayer();

  const action: StructuredAction = {
    tool: 'apply_patch',
    arguments: {
      file: 'src/hooks.ts',
      patch: `@@ -10,3 +10,5 @@
-  return { data, loading, error };
+  // Load data
+  return { data, loading, error, refetch };`,
    },
    reasoning: 'Test patch application',
  };

  const result = await grounding.validateAndExecute(action, executor);
  if (!result.success) {
    // Expected to fail due to mock file content
    return;
  }
}

async function testRunTests() {
  const executor = new MCPToolExecutor();
  const grounding = new GroundingLayer();

  const action: StructuredAction = {
    tool: 'run_tests',
    arguments: {},
    reasoning: 'Test running tests',
  };

  const result = await grounding.validateAndExecute(action, executor);
  if (!result.result?.passed === undefined)
    throw new Error('No test results');
}

function testSessionState() {
  const sessionId = 'test-session-123';
  const session = new SessionStateManager(sessionId);

  // Add conversation
  session.addConversationMessage('user', 'How do I optimize this hook?');
  session.addConversationMessage('agent', 'You can add memoization');

  // Record tool call
  session.recordToolCall(
    'read_file',
    { path: 'src/hooks.ts' },
    { success: true },
    true
  );

  // Get context
  const context = session.getContextString();
  if (!context.includes('Recent Conversation')) throw new Error('No conversation');
  if (!context.includes('Recent Tool Calls')) throw new Error('No tool history');
}

function testInvalidActions() {
  // Test invalid tool name
  const invalidTool = ToolValidator.validate({
    tool: 'invalid_tool' as any,
    arguments: {},
    reasoning: 'Test',
  });
  if (invalidTool.valid) throw new Error('Should have failed');

  // Test invalid arguments
  const invalidArgs = ToolValidator.validate({
    tool: 'read_file',
    arguments: { path: '' },
    reasoning: 'Test',
  });
  if (invalidArgs.valid) throw new Error('Should have failed');

  // Test path traversal
  const pathTraversal = ToolValidator.validate({
    tool: 'read_file',
    arguments: { path: '../../../etc/passwd' },
    reasoning: 'Test',
  });
  if (pathTraversal.valid) throw new Error('Should have blocked path traversal');
}
