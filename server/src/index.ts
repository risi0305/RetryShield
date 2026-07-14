import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health.js'
import { payRouter } from './routes/pay.js'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/pay', payRouter)

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
