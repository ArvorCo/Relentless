/**
 * Shared command runner with idle timeout support for agent adapters.
 */

export interface RunCommandOptions {
  cwd?: string;
  stdin?: Blob;
  timeoutMs?: number;
  /** Environment variables to pass to the command */
  env?: Record<string, string>;
  /** AbortSignal for cancelling the command */
  signal?: AbortSignal;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  timedOut: boolean;
  /** Whether the command was aborted via signal */
  aborted: boolean;
}

async function readStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: () => void
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          output += chunk;
          onChunk();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return output;
}

export async function runCommand(
  command: string[],
  options: RunCommandOptions = {}
): Promise<RunCommandResult> {
  const startTime = Date.now();

  // Merge custom env vars with current process env
  const env = options.env
    ? { ...process.env, ...options.env }
    : undefined;

  const proc = Bun.spawn(command, {
    cwd: options.cwd,
    stdin: options.stdin,
    stdout: "pipe",
    stderr: "pipe",
    env,
  });

  let lastOutput = Date.now();
  let timedOut = false;
  let aborted = false;
  let idleTimer: ReturnType<typeof setInterval> | undefined;

  const onChunk = () => {
    lastOutput = Date.now();
  };

  // Handle abort signal - kill the process when skip is requested
  const abortHandler = () => {
    aborted = true;
    proc.kill("SIGTERM");
    // Give it a moment, then force kill if still running
    setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        // Process already exited, ignore
      }
    }, 1000);
  };

  if (options.signal) {
    if (options.signal.aborted) {
      // Already aborted before we started
      proc.kill("SIGTERM");
      aborted = true;
    } else {
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }
  }

  // NOTE: We no longer kill the process on idle timeout.
  // Idle timeout is just informational - the TUI will show a warning
  // and let the user decide to skip if needed.
  // The process continues running until it completes naturally.
  if (options.timeoutMs && options.timeoutMs > 0) {
    idleTimer = setInterval(() => {
      if (Date.now() - lastOutput > options.timeoutMs!) {
        timedOut = true;
        // We intentionally do NOT kill the process here anymore.
        // Just mark that idle timeout was reached for informational purposes.
        clearInterval(idleTimer!);
        idleTimer = undefined;
      }
    }, 1000);
  }

  // Read streams - they may error if process is killed, so we handle that
  let stdout = "";
  let stderr = "";
  try {
    [stdout, stderr] = await Promise.all([
      readStream(proc.stdout, onChunk),
      readStream(proc.stderr, onChunk),
    ]);
  } catch {
    // Stream read failed, likely due to process being killed
    // Continue with whatever output we collected
  }

  const exitCode = await proc.exited;

  // Cleanup
  if (idleTimer) {
    clearInterval(idleTimer);
  }
  if (options.signal) {
    options.signal.removeEventListener("abort", abortHandler);
  }

  return {
    stdout,
    stderr,
    exitCode,
    duration: Date.now() - startTime,
    timedOut,
    aborted,
  };
}
