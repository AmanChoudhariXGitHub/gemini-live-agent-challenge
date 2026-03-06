import type { StructuredAction, ToolResult } from './types.js';
import { MCPToolExecutor } from './mcp-tool-executor.js';
import { ToolValidator } from './tool-validator.js';

/**
 * Grounding layer: Validates tool calls before execution.
 * Prevents hallucination by:
 * 1. Validating action structure and arguments
 * 2. Reading actual files to verify patches
 * 3. Simulating patch application before execution
 * 4. Providing closed-loop feedback to agent
 */
export class GroundingLayer {
  /**
   * Validate and execute a tool call
   */
  async validateAndExecute(
    action: StructuredAction,
    executor: MCPToolExecutor
  ): Promise<ToolResult> {
    console.log('[v0] Grounding layer processing:', action.tool);

    try {
      // Step 1: Validate action structure
      const validation = ToolValidator.validate(action);
      if (!validation.valid) {
        console.error('[v0] Validation failed:', validation.error);
        return {
          success: false,
          error: validation.error,
        };
      }

      // Step 2: Execute tool with enhanced validation
      switch (action.tool) {
        case 'apply_patch':
          return await this.validateAndApplyPatch(action, executor);

        case 'read_file':
        case 'search_repo':
        case 'run_tests':
          // Execute with standard validation
          const result = await executor.executeTool(
            action.tool,
            action.arguments
          );

          // Validate result structure
          const resultValidation = ToolValidator.validateResult(result);
          if (!resultValidation.valid) {
            console.error('[v0] Invalid result:', resultValidation.error);
            return {
              success: false,
              error: resultValidation.error,
            };
          }

          return result;

        default:
          return {
            success: false,
            error: `Unknown tool: ${action.tool}`,
          };
      }
    } catch (error) {
      console.error('[v0] Grounding layer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Validate and apply patch with grounding
   */
  private async validateAndApplyPatch(
    action: StructuredAction,
    executor: MCPToolExecutor
  ): Promise<ToolResult> {
    const { file, patch } = action.arguments;

    console.log('[v0] Patch grounding: validating patch for', file);

    // Step 1: Validate patch structure
    if (!this.isValidUnifiedDiff(patch)) {
      return {
        success: false,
        error:
          'Invalid patch format. Expected unified diff with @@ markers or +++ / --- lines.',
      };
    }

    // Step 2: Read the current file
    console.log('[v0] Reading file to ground patch validation:', file);
    const readResult = await executor.executeTool('read_file', { path: file });

    if (!readResult.success) {
      return {
        success: false,
        error: `Cannot validate patch: file not found or error reading file`,
      };
    }

    // Step 3: Extract file content
    const fileData = readResult.result as any;
    const fileContent = typeof fileData === 'string' ? fileData : fileData.content;

    if (!fileContent) {
      return {
        success: false,
        error: 'Cannot read file content for patch validation',
      };
    }

    // Step 4: Simulate patch application
    const patchAnalysis = this.analyzePatch(fileContent, patch);
    if (!patchAnalysis.canApply) {
      return {
        success: false,
        error: `Patch validation failed: ${patchAnalysis.reason}`,
      };
    }

    console.log('[v0] Patch validation passed:', patchAnalysis.summary);

    // Step 5: Execute the patch
    const result = await executor.executeTool('apply_patch', {
      file,
      patch,
    });

    // Validate result
    const resultValidation = ToolValidator.validateResult(result);
    if (!resultValidation.valid) {
      return {
        success: false,
        error: `Tool result validation failed: ${resultValidation.error}`,
      };
    }

    console.log('[v0] Patch executed successfully');
    return result;
  }

  /**
   * Check if patch is in valid unified diff format
   */
  private isValidUnifiedDiff(patch: string): boolean {
    // Must contain unified diff markers
    const hasHeaderMarker = /^---\s+/.test(patch) || /^\+\+\+\s+/.test(patch);
    const hasHunkMarker = /^@@\s+-\d+/.test(patch);
    const hasLineMarkers = /^[\s-+\\]/.test(patch);

    return hasHeaderMarker || hasHunkMarker || hasLineMarkers;
  }

  /**
   * Analyze patch to determine if it can be applied
   */
  private analyzePatch(
    fileContent: string,
    patch: string
  ): { canApply: boolean; summary: string; reason?: string } {
    // Extract removed lines (lines starting with -)
    const patchLines = patch.split('\n');
    const removedLines = patchLines
      .filter((line) => line.startsWith('-') && !line.startsWith('---'))
      .map((line) => line.substring(1));

    const addedLines = patchLines
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.substring(1));

    // Check if all removed lines exist in file
    const missingLines: string[] = [];
    for (const removedLine of removedLines) {
      if (removedLine && removedLine.trim() && !fileContent.includes(removedLine)) {
        missingLines.push(removedLine);
      }
    }

    if (missingLines.length > 0) {
      return {
        canApply: false,
        summary: `Patch references ${missingLines.length} lines not in file`,
        reason: `Cannot find line in file: "${missingLines[0].substring(0, 50)}..."`,
      };
    }

    // Patch can be applied
    return {
      canApply: true,
      summary: `Patch validated: ${removedLines.length} lines removed, ${addedLines.length} lines added`,
    };
  }

  /**
   * Generate feedback for failed validation
   */
  generateValidationFeedback(
    action: StructuredAction,
    error: string
  ): string {
    return `Tool validation failed for ${action.tool}: ${error}. Please verify your arguments and try again.`;
  }
}
