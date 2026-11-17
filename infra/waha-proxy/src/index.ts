import { serve } from '@hono/node-server'
import { loadProxyConfig } from './config.ts'
import { ProxyStore } from './db/store.ts'
import { getProxyLogger, setupProxyLogger } from './observability/logger.ts'
import { createProxyApp } from './server.ts'
import { WahaClient } from './waha/client.ts'
import { WebhookEmulator } from './webhooks/emulator.ts'
import { HumanDispatcher } from './worker/human-dispatcher.ts'

const config = loadProxyConfig()
setupProxyLogger({ level: config.logLevel, format: config.logFormat })
const logger = getProxyLogger('bootstrap')

const store = new ProxyStore(config.dbPath)
const recovered = store.resetStuckProcessingJobs()
if (recovered > 0) {
  logger.warn('Re-queued {recovered} interrupted outbound jobs on startup', {
    recovered,
  })
}

const waha = new WahaClient(config.wahaBaseUrl, config.wahaApiKey)
const webhooks = new WebhookEmulator(config, store)
const dispatcher = new HumanDispatcher(config, store, waha, webhooks)
dispatcher.recoverPendingSessions()

const app = createProxyApp({
  config,
  store,
  waha,
  dispatcher,
  webhooks,
})

const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: '0.0.0.0',
  },
  (info) => {
    logger.info(
      'waha-proxy listening on {address}:{port} -> WAHA {wahaBaseUrl} (logLevel={logLevel}, logFormat={logFormat})',
      {
        address: info.address,
        port: info.port,
        wahaBaseUrl: config.wahaBaseUrl,
        logLevel: config.logLevel,
        logFormat: config.logFormat,
      },
    )
    if (config.copasApiStatusWebhookUrl && config.copasStatusWebhookSecret) {
      void webhooks
        .syncAllSessionsStatus(waha)
        .then((res) => {
          logger.info(
            'Initial CoPAS channel status sync finished (reachable={reachable}, forwarded={forwarded}, skipped={skipped}, failed={failed})',
            res,
          )
        })
        .catch(() => undefined)
    }
  },
)

function shutdown(signal: string): void {
  logger.info('Received {signal}, shutting down gracefully...', { signal })
  server.close(async () => {
    await dispatcher.waitIdle().catch(() => undefined)
    store.close()
    logger.info('waha-proxy shutdown complete')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
