import { Router } from 'express'
import { getAllTransactions } from '../services/transactionService.js'

export const dashboardRouter = Router()

const TREND_DAYS = 7

dashboardRouter.get('/', async (_req, res) => {
  try {
    const transactions = await getAllTransactions()

    const totalSimulations = transactions.length
    const totalAmountProcessed = transactions.reduce((sum, t) => sum + t.amount, 0)

    const preventedDuplicates = transactions.filter((t) => t.status === 'duplicate_ignored')
    const totalDuplicatesPrevented = preventedDuplicates.length
    const totalAmountProtected = preventedDuplicates.reduce((sum, t) => sum + t.amount, 0)

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

    return res.status(200).json({
      totalSimulations,
      totalAmountProcessed,
      totalDuplicatesPrevented,
      totalAmountProtected,
      dailyCounts,
      recentSimulations,
    })
  } catch (err) {
    console.error('[dashboard] failed to compute stats', err)
    return res.status(500).json({ error: 'failed to load dashboard stats' })
  }
})
