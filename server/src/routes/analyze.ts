import { Router } from 'express'
import { generateRootCauseAnalysis } from '../services/aiClient.js'
import { getTransactionByKey } from '../services/transactionService.js'

export const analyzeRouter = Router()

analyzeRouter.post('/', async (req, res) => {
  const { idempotencyKey } = req.body ?? {}

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    return res.status(400).json({ error: 'idempotencyKey is required' })
  }

  try {
    const transaction = await getTransactionByKey(idempotencyKey)
    if (!transaction) {
      return res.status(404).json({ error: 'no transaction found for idempotencyKey' })
    }

    const analysis = await generateRootCauseAnalysis(transaction.events)
    return res.status(200).json(analysis)
  } catch (err) {
    console.error('[analyze] failed to generate AI report', err)
    return res.status(500).json({ error: 'Failed to generate the AI report. Please try again.' })
  }
})
