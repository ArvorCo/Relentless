/**
 * Shared command runner with idle timeout support for agent adapters.
 */

export interface RunCommandOptions {
  cwd?: string;
  stdin?: Blob;
  timeoutMs?: number;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  timedOut: boolean;
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
  const proc = Bun.spawn(command, {
    cwd: options.cwd,
    stdin: options.stdin,
    stdout: "pipe",
    stderr: "pipe",
  });

  let lastOutput = Date.now();
  let timedOut = false;
  let idleTimer: ReturnType<typeof setInterval> | undefined;

  const onChunk = () => {
    lastOutput = Date.now();
  };

  if (options.timeoutMs && options.timeoutMs > 0) {
    idleTimer = setInterval(() => {
      if (Date.now() - lastOutput > options.timeoutMs!) {
        timedOut = true;
        try {
          proc.kill();
        } catch {
          // Best-effort kill on timeout.
        }
      }
    }, 500);
  }

  const [stdout, stderr] = await Promise.all([
    readStream(proc.stdout, onChunk),
    readStream(proc.stderr, onChunk),
  ]);
  const exitCode = await proc.exited;

  if (idleTimer) {
    clearInterval(idleTimer);
  }

  return {
    stdout,
    stderr,
    exitCode,
    duration: Date.now() - startTime,
    timedOut,
  };
}
