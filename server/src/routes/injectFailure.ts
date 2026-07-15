import { Router } from 'express'
import {
  appendEvent,
  getTransactionByKey,
  setFailureConfig,
  type FailurePoint,
  type FailureType,
} from '../services/transactionService.js'

export const injectFailureRouter = Router()

const FAILURE_TYPES: FailureType[] = [
  'Network Lost After Request Sent',
  'Timeout Before Response',
  'Partial Response Received',
]

const FAILURE_POINTS: FailurePoint[] = [
  'Between Customer and Merchant',
  'Between PSP and Bank',
  'Between Bank and PSP (response)',
]

injectFailureRouter.post('/', async (req, res) => {
  const { idempotencyKey, simulateFailure, failureType, failurePoint, delaySeconds } = req.body ?? {}

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    return res.status(400).json({ error: 'idempotencyKey is required' })
  }

  if (simulateFailure) {
    if (!FAILURE_TYPES.includes(failureType)) {
      return res.status(400).json({ error: `failureType must be one of: ${FAILURE_TYPES.join(', ')}` })
    }
    if (!FAILURE_POINTS.includes(failurePoint)) {
      return res.status(400).json({ error: `failurePoint must be one of: ${FAILURE_POINTS.join(', ')}` })
    }
    if (typeof delaySeconds !== 'number' || !Number.isFinite(delaySeconds) || delaySeconds < 0) {
      return res.status(400).json({ error: 'delaySeconds must be a non-negative number' })
    }
  }

  try {
    const existing = await getTransactionByKey(idempotencyKey)
    if (!existing) {
      return res.status(404).json({ error: 'no transaction found for idempotencyKey' })
    }

    if (simulateFailure) {
      await setFailureConfig(idempotencyKey, { failureType, failurePoint })
      await appendEvent(idempotencyKey, {
        step: 'network_failure',
        detail: `Network failure – Response lost (${failureType}, ${failurePoint}, timeout ${delaySeconds}s)`,
      })
    } else {
      await setFailureConfig(idempotencyKey, { failureType: null, failurePoint: null })
      await appendEvent(idempotencyKey, {
        step: 'failure_injection_skipped',
        detail: 'No failure simulated — clean path',
      })
    }

    const updated = await getTransactionByKey(idempotencyKey)
    return res.status(200).json({ transaction: updated })
  } catch (err) {
    console.error('[injectFailure] failed to apply failure injection', err)
    return res.status(500).json({ error: 'failed to apply failure injection' })
  }
})
