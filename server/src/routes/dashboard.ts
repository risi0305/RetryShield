import { Router } from 'express'
import { getAllTransactions } from '../services/transactionService.js'

export const dashboardRouter = Router()

const TREND_DAYS = 7
const ACTIVITY_FEED_LIMIT = 6

// Only the "headline" events are surfaced in the activity feed — the full
// blow-by-blow (request forwarded, bank approved, ...) lives on Incident
// Timeline instead.
const ACTIVITY_STEP_LABELS: Record<string, { verb: string; tone: 'success' | 'failed' | 'duplicate' }> = {
  payment_success: { verb: 'Payment successful', tone: 'success' },
  payment_failed: { verb: 'Payment failed', tone: 'failed' },
  duplicate_detected: { verb: 'Duplicate blocked', tone: 'duplicate' },
  retry_after_failure: { verb: 'Retry succeeded', tone: 'success' },
  retry_processed: { verb: 'Retry succeeded', tone: 'success' },
}

dashboardRouter.get('/', async (_req, res) => {
  try {
    const transactions = await getAllTransactions()

    const totalSimulations = transactions.length
    const totalAmountProcessed = transactions.reduce((sum, t) => sum + t.amount, 0)

    const preventedDuplicates = transactions.filter((t) => t.status === 'duplicate_ignored')
    const totalDuplicatesPrevented = preventedDuplicates.length
    const totalAmountProtected = preventedDuplicates.reduce((sum, t) => sum + t.amount, 0)

    // A `duplicate_ignored` transaction's underlying charge succeeded too —
    // the retry was just correctly blocked — so it counts toward success.
    const resolvedSuccessfully = transactions.filter(
      (t) => t.status === 'success' || t.status === 'duplicate_ignored',
    ).length
    const successRate = totalSimulations === 0 ? 0 : Math.round((resolvedSuccessfully / totalSimulations) * 1000) / 10

    const dailyCounts: { date: string; count: number }[] = []
    const dayBuckets = new Map<string, number>()
    const today = new Date()
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dayBuckets.set(d.toISOString().slice(0, 10), 0)
    }
    for (const t of transactions) {
      const key = t.createdAt.toDate().toISOString().slice(0, 10)
      if (dayBuckets.has(key)) {
        dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1)
      }
    }
    for (const [date, count] of dayBuckets) {
      dailyCounts.push({ date, count })
    }

    const recentSimulations = transactions.slice(0, 5).map((t) => ({
      idempotencyKey: t.idempotencyKey,
      amount: t.amount,
      paymentMethod: t.paymentMethod,
      status: t.status,
      createdAt: t.createdAt,
    }))

    const recentActivity = transactions
      .flatMap((t) =>
        t.events
          .filter((e) => ACTIVITY_STEP_LABELS[e.step])
          .map((e) => {
            const label = ACTIVITY_STEP_LABELS[e.step]
            return {
              message: `${label.verb} — ₹${t.amount}`,
              tone: label.tone,
              timestamp: e.timestamp,
              idempotencyKey: t.idempotencyKey,
            }
          }),
      )
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
      .slice(0, ACTIVITY_FEED_LIMIT)

    return res.status(200).json({
      totalSimulations,
      totalAmountProcessed,
      totalDuplicatesPrevented,
      totalAmountProtected,
      successRate,
      dailyCounts,
      recentSimulations,
      recentActivity,
    })
  } catch (err) {
    console.error('[dashboard] failed to compute stats', err)
    return res.status(500).json({ error: 'failed to load dashboard stats' })
  }
})
