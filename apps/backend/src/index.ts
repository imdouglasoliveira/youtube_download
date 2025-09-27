import express from 'express'
import { config } from './config/env'
import { logger } from './utils/logger'
import { corsMiddleware } from './middleware/cors'
import { errorHandler } from './middleware/error'
import { specs } from './config/swagger'
import routes from './routes'
// YtDlpService will be lazily initialized in controllers

const app: express.Application = express()

// JSON parsing with error handling
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      logger.error(`JSON parsing error: ${err.message}`)
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON format in request body'
      })
    }
    next()
  })
})

app.use(express.urlencoded({ extended: true }))
app.use(corsMiddleware)

// Swagger JSON endpoint - DEVE VIR PRIMEIRO
app.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json(specs)
})

// Swagger UI endpoint
app.get('/api-docs', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>YouTube Downloader API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
  `)
})

// Redirect root to API docs
app.get('/', (_req, res) => {
  res.redirect('/api-docs')
})

app.use(routes)

app.use(errorHandler)

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`)
  logger.info(`CORS enabled for: ${Array.isArray(config.corsOrigin) ? config.corsOrigin.join(', ') : config.corsOrigin}`)
  logger.info(`Default download path: ${config.defaultDownloadPath}`)
})

// Graceful shutdown handlers
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} signal received: initiating graceful shutdown`)

  // Close HTTP server first
  server.close(() => {
    logger.info('HTTP server closed')

    // YtDlpService cleanup will be handled by controller's singleton

    // Force garbage collection
    if (global.gc) {
      global.gc()
    }

    logger.info('Graceful shutdown completed')
    process.exit(0)
  })

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Memory monitoring
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

// Memory usage monitoring (disabled during startup to avoid crashes)
// setInterval(() => {
//   const usage = process.memoryUsage()
//   const usedMB = Math.round(usage.heapUsed / 1024 / 1024)
//   const totalMB = Math.round(usage.heapTotal / 1024 / 1024)

//   logger.debug(`Memory usage: ${usedMB}MB / ${totalMB}MB`)

//   // Warning if memory usage is high
//   if (usedMB > 200) {
//     logger.warn(`High memory usage detected: ${usedMB}MB`)
//   }
// }, 30000) // Every 30 seconds

export default app