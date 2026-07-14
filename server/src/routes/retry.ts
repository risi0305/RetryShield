import { Router } from 'express'
import { appendEvent, getTransactionByKey, setTransactionStatus } from '../services/transactionService.js'

export const retryRouter = Router()

retryRouter.post('/', async (req, res) => {
  const { idempotencyKey } = req.body ?? {}

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    return res.status(400).json({ error: 'idempotencyKey is required' })
  }

  try {
    const existing = await getTransactionByKey(idempotencyKey)
    if (!existing) {
      return res.status(404).json({ error: 'no transaction found for idempotencyKey' })
    }

    if (existing.status === 'success') {
      // Idempotency check: a prior attempt already succeeded, so this retry is
      // a duplicate — record it as such instead of charging again.
      await appendEvent(idempotencyKey, {
        step: 'duplicate_detected',
        detail: 'Duplicate request detected by system',
      })
      await appendEvent(idempotencyKey, {
        step: 'retry_ignored',
        detail: 'Retry ignored — Original transaction returned',
      })
      await setTransactionStatus(idempotencyKey, existing.status)
    } else {
      await appendEvent(idempotencyKey, {
        step: 'retry_processed',
        detail: 'Retry processed — payment completed',
      })
      await setTransactionStatus(idempotencyKey, 'success')
    }

    const updated = await getTransactionByKey(idempotencyKey)
    return res.status(200).json({ transaction: updated })
  } catch (err) {
    console.error('[retry] failed to process retry', err)
    return res.status(500).json({ error: 'failed to process retry' })
  }
})
