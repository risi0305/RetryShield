import { onRequest } from 'firebase-functions/v2/https'
import { app } from './app.js'

/**
 * Secrets are bound here so Firebase injects them into process.env at
 * runtime — the code in services/firebase.ts and services/aiClient.ts reads
 * process.env directly and needs no changes to work in either environment.
 */
export const api = onRequest(
  {
    secrets: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'AI_API_KEY', 'ACCESS_CODE'],
  },
  app,
)
