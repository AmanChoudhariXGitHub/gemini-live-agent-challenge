/**
 * Monitoring and metrics collection for LivePair
 */
export interface Metrics {
  sessionId: string;
  audioLatency: number[]; // milliseconds
  geminiResponseTime: number[]; // milliseconds
  toolExecutionTime: Map<string, number[]>; // tool name -> times
  errorCount: number;
  successfulToolCalls: number;
  failedToolCalls: number;
  patchValidationErrors: number;
  timestamp: Date;
}

export class Monitor {
  private metrics: Map<string, Metrics> = new Map();
  private readonly maxMetrics = 100; // Keep last 100 metrics per session

  /**
   * Record audio latency
   */
  recordAudioLatency(sessionId: string, latencyMs: number): void {
    const metrics = this.getOrCreateMetrics(sessionId);
    metrics.audioLatency.push(latencyMs);

    if (metrics.audioLatency.length > this.maxMetrics) {
      metrics.audioLatency.shift();
    }

    if (latencyMs > 2000) {
      console.warn(
        `[v0] High audio latency for session ${sessionId}: ${latencyMs}ms`
      );
    }
  }

  /**
   * Record Gemini response time
   */
  recordGeminiResponseTime(sessionId: string, responseTimeMs: number): void {
    const metrics = this.getOrCreateMetrics(sessionId);
    metrics.geminiResponseTime.push(responseTimeMs);

    if (metrics.geminiResponseTime.length > this.maxMetrics) {
      metrics.geminiResponseTime.shift();
    }

    if (responseTimeMs > 5000) {
      console.warn(
        `[v0] Slow Gemini response for session ${sessionId}: ${responseTimeMs}ms`
      );
    }
  }

  /**
   * Record tool execution time
   */
  recordToolExecutionTime(
    sessionId: string,
    toolName: string,
    timeMs: number
  ): void {
    const metrics = this.getOrCreateMetrics(sessionId);

    if (!metrics.toolExecutionTime.has(toolName)) {
      metrics.toolExecutionTime.set(toolName, []);
    }

    const times = metrics.toolExecutionTime.get(toolName)!;
    times.push(timeMs);

    if (times.length > this.maxMetrics) {
      times.shift();
    }

    if (timeMs > 10000) {
      console.warn(
        `[v0] Tool timeout risk for ${toolName}: ${timeMs}ms (max: 10s)`
      );
    }
  }

  /**
   * Record successful tool call
   */
  recordToolSuccess(sessionId: string): void {
    const metrics = this.getOrCreateMetrics(sessionId);
    metrics.successfulToolCalls++;
  }

  /**
   * Record failed tool call
   */
  recordToolFailure(sessionId: string): void {
    const metrics = this.getOrCreateMetrics(sessionId);
    metrics.failedToolCalls++;
  }

  /**
   * Record patch validation error
   */
  recordPatchValidationError(sessionId: string): void {
    const metrics = this.getOrCreateMetrics(sessionId);
    metrics.patchValidationErrors++;
  }

  /**
   * Record error
   */
  recordError(sessionId: string): void {
    const metrics = this.getOrCreateMetrics(sessionId);
    metrics.errorCount++;
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(sessionId: string): {
    avgAudioLatency: number;
    avgGeminiResponseTime: number;
    totalToolCalls: number;
    successRate: number;
    errors: number;
  } {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) {
      return {
        avgAudioLatency: 0,
        avgGeminiResponseTime: 0,
        totalToolCalls: 0,
        successRate: 0,
        errors: 0,
      };
    }

    const avgAudioLatency =
      metrics.audioLatency.length > 0
        ? metrics.audioLatency.reduce((a, b) => a + b, 0) /
          metrics.audioLatency.length
        : 0;

    const avgGeminiResponseTime =
      metrics.geminiResponseTime.length > 0
        ? metrics.geminiResponseTime.reduce((a, b) => a + b, 0) /
          metrics.geminiResponseTime.length
        : 0;

    const totalToolCalls =
      metrics.successfulToolCalls + metrics.failedToolCalls;
    const successRate =
      totalToolCalls > 0
        ? (metrics.successfulToolCalls / totalToolCalls) * 100
        : 0;

    return {
      avgAudioLatency: Math.round(avgAudioLatency),
      avgGeminiResponseTime: Math.round(avgGeminiResponseTime),
      totalToolCalls,
      successRate: Math.round(successRate),
      errors: metrics.errorCount,
    };
  }

  /**
   * Log metrics summary
   */
  logMetricsSummary(sessionId: string): void {
    const summary = this.getMetricsSummary(sessionId);
    console.log(`[v0] Session ${sessionId} metrics:`);
    console.log(`     Audio latency (avg): ${summary.avgAudioLatency}ms`);
    console.log(`     Gemini response (avg): ${summary.avgGeminiResponseTime}ms`);
    console.log(`     Tool calls: ${summary.totalToolCalls} (${summary.successRate}% success)`);
    console.log(`     Errors: ${summary.errors}`);
  }

  /**
   * Clear metrics for session
   */
  clearMetrics(sessionId: string): void {
    this.metrics.delete(sessionId);
  }

  /**
   * Get or create metrics
   */
  private getOrCreateMetrics(sessionId: string): Metrics {
    if (!this.metrics.has(sessionId)) {
      this.metrics.set(sessionId, {
        sessionId,
        audioLatency: [],
        geminiResponseTime: [],
        toolExecutionTime: new Map(),
        errorCount: 0,
        successfulToolCalls: 0,
        failedToolCalls: 0,
        patchValidationErrors: 0,
        timestamp: new Date(),
      });
    }

    return this.metrics.get(sessionId)!;
  }
}

// Export singleton
export const monitor = new Monitor();
