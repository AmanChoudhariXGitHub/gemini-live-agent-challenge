import type { StructuredAction, ToolResult } from './types.js';

/**
 * Validates tool calls and arguments before execution
 */
export class ToolValidator {
  /**
   * Validate a structured action
   */
  static validate(action: StructuredAction): {
    valid: boolean;
    error?: string;
  } {
    // Check tool name
    const validTools = [
      'read_file',
      'search_repo',
      'apply_patch',
      'run_tests',
    ];
    if (!validTools.includes(action.tool)) {
      return {
        valid: false,
        error: `Invalid tool: ${action.tool}. Valid tools: ${validTools.join(', ')}`,
      };
    }

    // Check arguments structure
    if (!action.arguments || typeof action.arguments !== 'object') {
      return {
        valid: false,
        error: 'Arguments must be a non-empty object',
      };
    }

    // Tool-specific validation
    switch (action.tool) {
      case 'read_file':
        return this.validateReadFile(action);

      case 'search_repo':
        return this.validateSearchRepo(action);

      case 'apply_patch':
        return this.validateApplyPatch(action);

      case 'run_tests':
        return this.validateRunTests(action);

      default:
        return { valid: false, error: `Unknown tool: ${action.tool}` };
    }
  }

  /**
   * Validate read_file arguments
   */
  private static validateReadFile(action: StructuredAction): {
    valid: boolean;
    error?: string;
  } {
    const { path } = action.arguments;

    if (!path || typeof path !== 'string') {
      return {
        valid: false,
        error: 'read_file: path argument must be a non-empty string',
      };
    }

    // Prevent path traversal
    if (path.includes('..') || path.startsWith('/')) {
      return {
        valid: false,
        error: 'read_file: invalid path - path traversal detected',
      };
    }

    return { valid: true };
  }

  /**
   * Validate search_repo arguments
   */
  private static validateSearchRepo(action: StructuredAction): {
    valid: boolean;
    error?: string;
  } {
    const { query } = action.arguments;

    if (!query || typeof query !== 'string') {
      return {
        valid: false,
        error: 'search_repo: query argument must be a non-empty string',
      };
    }

    if (query.length > 100) {
      return {
        valid: false,
        error: 'search_repo: query is too long (max 100 characters)',
      };
    }

    return { valid: true };
  }

  /**
   * Validate apply_patch arguments
   */
  private static validateApplyPatch(action: StructuredAction): {
    valid: boolean;
    error?: string;
  } {
    const { file, patch } = action.arguments;

    if (!file || typeof file !== 'string') {
      return {
        valid: false,
        error: 'apply_patch: file argument must be a non-empty string',
      };
    }

    if (!patch || typeof patch !== 'string') {
      return {
        valid: false,
        error: 'apply_patch: patch argument must be a non-empty string',
      };
    }

    // Prevent path traversal
    if (file.includes('..') || file.startsWith('/')) {
      return {
        valid: false,
        error: 'apply_patch: invalid file path - path traversal detected',
      };
    }

    // Check patch format
    const hasValidFormat =
      patch.includes('@@') || patch.includes('+++') || patch.includes('---');
    if (!hasValidFormat) {
      return {
        valid: false,
        error:
          'apply_patch: patch must be in unified diff format (@@ markers or +++ / --- lines)',
      };
    }

    return { valid: true };
  }

  /**
   * Validate run_tests arguments
   */
  private static validateRunTests(action: StructuredAction): {
    valid: boolean;
    error?: string;
  } {
    // run_tests takes no arguments, just validate structure
    const args = action.arguments;

    if (Object.keys(args).length > 0) {
      console.warn('[v0] run_tests: ignoring unexpected arguments');
    }

    return { valid: true };
  }

  /**
   * Validate tool result
   */
  static validateResult(result: ToolResult): {
    valid: boolean;
    error?: string;
  } {
    if (!result || typeof result !== 'object') {
      return {
        valid: false,
        error: 'Tool result must be an object',
      };
    }

    if (!('success' in result) || typeof result.success !== 'boolean') {
      return {
        valid: false,
        error: 'Tool result must have success: boolean field',
      };
    }

    // If failed, must have error
    if (!result.success && !result.error) {
      return {
        valid: false,
        error: 'Failed tool result must have error message',
      };
    }

    // If successful, should have result
    if (result.success && !result.result) {
      console.warn('[v0] Tool succeeded but has no result field');
    }

    return { valid: true };
  }
}
