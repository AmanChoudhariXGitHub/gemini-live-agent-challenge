import type { ToolName, ToolResult } from './types.js';

/**
 * Executes MCP tools: read_file, search_repo, apply_patch, run_tests
 * Limited to 4 focused tools as per hackathon design.
 */
export class MCPToolExecutor {
  /**
   * Execute a tool with arguments
   */
  async executeTool(
    tool: ToolName,
    args: Record<string, any>
  ): Promise<ToolResult> {
    try {
      switch (tool) {
        case 'read_file':
          return this.readFile(args.path);

        case 'search_repo':
          return this.searchRepo(args.query);

        case 'apply_patch':
          return this.applyPatch(args.file, args.patch);

        case 'run_tests':
          return this.runTests();

        default:
          return {
            success: false,
            error: `Unknown tool: ${tool}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Read file contents (mock implementation with realistic examples)
   */
  private readFile(path: string): ToolResult {
    console.log(`[v0] read_file: ${path}`);

    // Validate path
    if (!path || typeof path !== 'string') {
      return {
        success: false,
        error: 'File path must be a non-empty string',
      };
    }

    // Mock file database
    const mockFiles: Record<string, string> = {
      'src/hooks.ts': `import React, { useState, useEffect } from 'react';

export function useData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchData()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}`,
      'src/utils.ts': `export function optimize(arr: number[]): number[] {
  return arr.map(x => x * 2);
}

export function isEmpty(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0;
}

export async function fetchData(): Promise<any> {
  const response = await fetch('/api/data');
  return response.json();
}`,
      'src/api.ts': `export const API_BASE = 'https://api.example.com';

export async function getUser(id: string) {
  const response = await fetch(\`\${API_BASE}/users/\${id}\`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}`,
      'src/components/Button.tsx': `import React from 'react';

export interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Button({ onClick, children, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}`,
    };

    // Search for matching file
    for (const [filePath, content] of Object.entries(mockFiles)) {
      if (filePath.includes(path) || path.includes(filePath)) {
        return {
          success: true,
          result: {
            path: filePath,
            content,
            size: content.length,
            lines: content.split('\n').length,
          },
        };
      }
    }

    return {
      success: false,
      error: `File not found: ${path}. Available: ${Object.keys(mockFiles).join(', ')}`,
    };
  }

  /**
   * Search repository for files/content (mock implementation)
   */
  private searchRepo(query: string): ToolResult {
    console.log(`[v0] search_repo: ${query}`);

    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: 'Search query must be a non-empty string',
      };
    }

    // Mock search results
    const mockResults = [
      {
        file: 'src/hooks.ts',
        line: 1,
        match: 'import React, { useState, useEffect } from "react";',
        context: 'Hook imports',
      },
      {
        file: 'src/utils.ts',
        line: 1,
        match: 'export function optimize(arr: number[]): number[]',
        context: 'Utility function',
      },
      {
        file: 'src/api.ts',
        line: 5,
        match: 'export async function getUser(id: string)',
        context: 'API endpoint',
      },
      {
        file: 'src/components/Button.tsx',
        line: 1,
        match: 'import React from "react";',
        context: 'Component import',
      },
    ];

    // Filter results based on query
    const results = mockResults.filter(
      (r) =>
        r.file.includes(query.toLowerCase()) ||
        r.match.toLowerCase().includes(query.toLowerCase()) ||
        r.context.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length === 0) {
      return {
        success: true,
        result: {
          query,
          found: 0,
          results: [],
          message: `No results found for query: "${query}"`,
        },
      };
    }

    return {
      success: true,
      result: {
        query,
        found: results.length,
        results,
      },
    };
  }

  /**
   * Apply patch to file (mock implementation with validation)
   */
  private applyPatch(file: string, patch: string): ToolResult {
    console.log(`[v0] apply_patch: ${file}`);

    // Validation
    if (!file || typeof file !== 'string') {
      return {
        success: false,
        error: 'File path must be a non-empty string',
      };
    }

    if (!patch || typeof patch !== 'string') {
      return {
        success: false,
        error: 'Patch must be a non-empty string',
      };
    }

    // Validate patch format (unified diff)
    const hasHunkMarker = /^@@\s+-\d+/.test(patch.trim());
    const hasLineMarkers = /^[\s-+\\]/.test(patch.trim());

    if (!hasHunkMarker && !hasLineMarkers) {
      return {
        success: false,
        error: 'Invalid patch format. Expected unified diff with @@ markers or diff lines (-, +)',
      };
    }

    // Count changes
    const lines = patch.split('\n');
    const addedLines = lines.filter((l) => l.startsWith('+')).length;
    const removedLines = lines.filter((l) => l.startsWith('-')).length;

    console.log(
      `[v0] Patch validation: ${removedLines} removed, ${addedLines} added lines`
    );

    // Mock: simulate patch application
    return {
      success: true,
      result: {
        file,
        linesRemoved: removedLines,
        linesAdded: addedLines,
        totalChanges: removedLines + addedLines,
        message: `Patch applied successfully to ${file}`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Run tests (mock implementation with varied results)
   */
  private runTests(): ToolResult {
    console.log('[v0] run_tests');

    // Mock test results - vary based on random seed for realistic demo
    const seed = Math.floor(Math.random() * 100);
    const hasFailures = seed < 20; // 20% chance of failures

    const testResults = {
      passed: hasFailures ? 38 : 42,
      failed: hasFailures ? 2 : 0,
      skipped: 2,
      duration: Math.random() * 3000 + 1000, // 1-4 seconds
      timestamp: new Date().toISOString(),
      tests: [
        { name: 'useData hook returns data', status: 'passed', duration: 5 },
        { name: 'useData handles errors', status: 'passed', duration: 8 },
        { name: 'optimize function doubles values', status: 'passed', duration: 3 },
        {
          name: 'getUser API error handling',
          status: hasFailures ? 'failed' : 'passed',
          duration: hasFailures ? 12 : 6,
          error: hasFailures ? 'Expected error message not thrown' : undefined,
        },
        { name: 'Button component renders', status: 'passed', duration: 4 },
      ],
    };

    return {
      success: !hasFailures,
      result: testResults,
    };
  }
}
