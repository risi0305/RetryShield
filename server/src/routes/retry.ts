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

    await appendEvent(idempotencyKey, {
      step: 'retry_initiated',
      detail: 'Customer/merchant retries payment',
    })

    if (existing.status === 'success' || existing.status === 'duplicate_ignored') {
      // Idempotency check: a prior attempt already succeeded (or was already
      // flagged as a duplicate), so this retry is a duplicate — record it as
      // such instead of charging again. This is the only branch that ever
      // marks a transaction `duplicate_ignored`, which is what the Dashboard
      // and Ledger Comparison "duplicates prevented" stats key off of.
      await appendEvent(idempotencyKey, {
        step: 'duplicate_detected',
        detail: 'Duplicate request detected by system',
      })
      await appendEvent(idempotencyKey, {
        step: 'retry_ignored',
        detail: 'Duplicate request detected — original transaction returned',
      })
      await setTransactionStatus(idempotencyKey, 'duplicate_ignored')
    } else if (existing.status === 'failed') {
      // The original attempt genuinely failed — a retry here is a brand new
      // attempt, not a duplicate, so it's processed as a fresh charge.
      await appendEvent(idempotencyKey, {
        step: 'retry_after_failure',
        detail: 'Retry attempted after genuine failure — new charge processed',
      })
      await setTransactionStatus(idempotencyKey, 'success')
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
