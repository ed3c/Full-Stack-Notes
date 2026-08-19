export class LifecycleState {
  private draining = false;

  beginDrain(): void {
    this.draining = true;
  }

  isReady(): boolean {
    return !this.draining;
  }
}

export interface ClosableServer {
  close(): Promise<void>;
}

export interface SignalSource {
  once(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

export interface ShutdownController {
  handle(signal: 'SIGTERM' | 'SIGINT'): Promise<void>;
}

export function installShutdownHandlers(
  source: SignalSource,
  server: ClosableServer,
  lifecycle: LifecycleState,
  timeoutMs: number,
  forceExit: (code: number) => void = (code) => process.exit(code)
): ShutdownController {
  let stopping = false;

  const handle = async (_signal: 'SIGTERM' | 'SIGINT'): Promise<void> => {
    if (stopping) return;
    stopping = true;
    lifecycle.beginDrain();

    const closed = await closeWithin(server, timeoutMs);
    if (!closed) forceExit(1);
  };

  source.once('SIGTERM', () => void handle('SIGTERM'));
  source.once('SIGINT', () => void handle('SIGINT'));
  return { handle };
}

async function closeWithin(server: ClosableServer, timeoutMs: number): Promise<boolean> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    const timeoutResult = new Promise<boolean>((resolve) => {
      timeout = setTimeout(() => resolve(false), timeoutMs);
    });
    const closeResult = server.close().then(
      () => true,
      () => false
    );
    return await Promise.race([closeResult, timeoutResult]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}
