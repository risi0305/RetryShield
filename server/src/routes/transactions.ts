import { Router } from 'express'
import { getAllTransactions, getTransactionByKey } from '../services/transactionService.js'

export const transactionsRouter = Router()

transactionsRouter.get('/', async (_req, res) => {
  try {
    const transactions = await getAllTransactions()
    return res.status(200).json({ transactions })
  } catch (err) {
    console.error('[transactions] failed to list transactions', err)
    return res.status(500).json({ error: 'failed to list transactions' })
  }
})

transactionsRouter.get('/:idempotencyKey', async (req, res) => {
  const { idempotencyKey } = req.params

  try {
    const transaction = await getTransactionByKey(idempotencyKey)
    if (!transaction) {
      return res.status(404).json({ error: 'no transaction found for idempotencyKey' })
    }
    return res.status(200).json({ transaction })
  } catch (err) {
    console.error('[transactions] failed to fetch transaction', err)
    return res.status(500).json({ error: 'failed to fetch transaction' })
  }
})
