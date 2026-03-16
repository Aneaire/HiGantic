import { runAgent, type RunAgentParams } from "./run-agent.js";

type RunnerFn = (params: RunAgentParams) => Promise<void>;

interface QueuedJob {
  params: RunAgentParams;
  jobId: string;
  runner: RunnerFn;
}

export type JobCompletionCallback = (
  jobId: string,
  result: "done" | "error",
  error?: string
) => void;

/**
 * Manages a bounded pool of concurrent agent runs with overflow queue.
 * When at capacity, new jobs are queued and processed FIFO.
 */
export class ProcessManager {
  private activeRuns = new Map<string, Promise<void>>();
  private queue: QueuedJob[] = [];
  private maxConcurrent: number;
  private timeoutMs: number;
  private onComplete?: JobCompletionCallback;

  constructor(opts?: {
    maxConcurrent?: number;
    timeoutMs?: number;
    onComplete?: JobCompletionCallback;
  }) {
    this.maxConcurrent =
      opts?.maxConcurrent ??
      parseInt(process.env.MAX_CONCURRENT_AGENTS ?? "20", 10);
    this.timeoutMs =
      opts?.timeoutMs ??
      parseInt(process.env.AGENT_TIMEOUT_MS ?? "300000", 10);
    this.onComplete = opts?.onComplete;
  }

  get activeCount() {
    return this.activeRuns.size;
  }

  get queueLength() {
    return this.queue.length;
  }

  submit(
    jobId: string,
    params: RunAgentParams,
    runner: RunnerFn = runAgent
  ): { queued: boolean } {
    if (this.activeRuns.has(jobId)) {
      return { queued: false };
    }

    if (this.activeRuns.size >= this.maxConcurrent) {
      this.queue.push({ params, jobId, runner });
      console.log(
        `[process-manager] Job ${jobId} queued (${this.queue.length} in queue, ${this.activeRuns.size} active)`
      );
      return { queued: true };
    }

    this.startRun(jobId, params, runner);
    return { queued: false };
  }

  private startRun(jobId: string, params: RunAgentParams, runner: RunnerFn) {
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(
        () => reject(new Error("Agent run timed out")),
        this.timeoutMs
      );
    });

    const runPromise = Promise.race([runner(params), timeoutPromise])
      .then(() => {
        this.onComplete?.(jobId, "done");
      })
      .catch((err) => {
        console.error(`[process-manager] Job ${jobId} failed:`, err.message);
        this.onComplete?.(jobId, "error", err.message);
      })
      .finally(() => {
        this.activeRuns.delete(jobId);
        console.log(
          `[process-manager] Job ${jobId} finished (${this.activeRuns.size} active, ${this.queue.length} queued)`
        );
        this.drainQueue();
      });

    this.activeRuns.set(jobId, runPromise);
    console.log(
      `[process-manager] Job ${jobId} started (${this.activeRuns.size} active)`
    );
  }

  private drainQueue() {
    while (
      this.queue.length > 0 &&
      this.activeRuns.size < this.maxConcurrent
    ) {
      const next = this.queue.shift()!;
      this.startRun(next.jobId, next.params, next.runner);
    }
  }
}
