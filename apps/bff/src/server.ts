import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { installShutdownHandlers } from './lifecycle.js';

const config = loadConfig();
const { app, lifecycle } = buildApp({ config });
installShutdownHandlers(process, app, lifecycle, config.shutdownTimeoutMs);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error({ err: error }, 'failed to start BFF');
  process.exitCode = 1;
}
