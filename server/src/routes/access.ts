import { Router } from 'express'

export const accessRouter = Router()

// A single shared code gating the frontend demo — not real authentication,
// just enough to stop a public link from being casually stumbled onto.
accessRouter.post('/verify', (req, res) => {
  const { code } = req.body ?? {}
  const expected = process.env.ACCESS_CODE

  if (!expected) {
    console.error('[access] ACCESS_CODE is not configured on the server')
    return res.status(500).json({ error: 'Access code is not configured on the server' })
  }

  if (typeof code === 'string' && code === expected) {
    return res.status(200).json({ valid: true })
  }

  return res.status(401).json({ valid: false, error: 'Incorrect access code.' })
})
