import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health.js'
import { injectFailureRouter } from './routes/injectFailure.js'
import { payRouter } from './routes/pay.js'
import { retryRouter } from './routes/retry.js'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/pay', payRouter)
app.use('/api/inject-failure', injectFailureRouter)
app.use('/api/retry', retryRouter)

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
