import { Router } from 'express'
import downloadRoutes from './download.routes'

const router: Router = Router()

router.use('/api', downloadRoutes)

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

export default router