import { Router } from 'express'
import { createTransaction, getTransactionByKey, type PaymentMethod } from '../services/transactionService.js'

export const payRouter = Router()

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Card']

function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: unknown } | undefined)?.code
  return code === 6 || /already exists/i.test((err as Error)?.message ?? '')
}

payRouter.post('/', async (req, res) => {
  const { idempotencyKey, amount, paymentMethod } = req.body ?? {}

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    return res.status(400).json({ error: 'idempotencyKey is required' })
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' })
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}` })
  }

  try {
    const transaction = await createTransaction({ idempotencyKey, amount, paymentMethod })
    return res.status(201).json({ transaction })
  } catch (err) {
    if (isAlreadyExists(err)) {
      try {
        const existing = await getTransactionByKey(idempotencyKey)
        return res.status(409).json({ error: 'duplicate idempotency key', transaction: existing })
      } catch (lookupErr) {
        console.error('[pay] failed to look up duplicate transaction', lookupErr)
        return res.status(500).json({ error: 'failed to create transaction' })
      }
    }
    console.error('[pay] failed to create transaction', err)
    return res.status(500).json({ error: 'failed to create transaction' })
  }
})
