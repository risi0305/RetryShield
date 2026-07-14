import { FieldValue, Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { db } from './firebase.js'

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'duplicate_ignored'
export type PaymentMethod = 'UPI' | 'Card'

export interface TransactionEvent {
  step: string
  timestamp: Timestamp
  detail: string
}

export interface TransactionDocument {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: TransactionStatus
  failureType: string | null
  failurePoint: string | null
  createdAt: Timestamp
  events: TransactionEvent[]
}

export interface NewTransactionInput {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status?: TransactionStatus
  failureType?: string | null
  failurePoint?: string | null
}

const COLLECTION = 'transactions'

function requireDb() {
  if (!db) {
    throw new Error(
      '[transactionService] Firestore is not initialized — check FIREBASE_* env vars in server/.env',
    )
  }
  return db
}

export async function createTransaction(data: NewTransactionInput): Promise<TransactionDocument> {
  const doc: TransactionDocument = {
    idempotencyKey: data.idempotencyKey,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    status: data.status ?? 'pending',
    failureType: data.failureType ?? null,
    failurePoint: data.failurePoint ?? null,
    createdAt: Timestamp.now(),
    events: [],
  }

  // .create() (not .set()) throws "already-exists" if the doc is already there —
  // the idempotency check relies on catching that to detect duplicates.
  await requireDb().collection(COLLECTION).doc(data.idempotencyKey).create(doc)
  return doc
}

export async function getTransactionByKey(idempotencyKey: string): Promise<TransactionDocument | null> {
  const snap = await requireDb().collection(COLLECTION).doc(idempotencyKey).get()
  return snap.exists ? (snap.data() as TransactionDocument) : null
}

export async function appendEvent(
  idempotencyKey: string,
  event: { step: string; detail: string },
): Promise<void> {
  // FieldValue.serverTimestamp() can't be used inside arrayUnion, so events
  // get a client-side Timestamp instead of the server-stamped one.
  const entry: TransactionEvent = {
    step: event.step,
    detail: event.detail,
    timestamp: Timestamp.now(),
  }

  await requireDb()
    .collection(COLLECTION)
    .doc(idempotencyKey)
    .update({ events: FieldValue.arrayUnion(entry) })
}

export async function getAllTransactions(): Promise<TransactionDocument[]> {
  const snap = await requireDb().collection(COLLECTION).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as TransactionDocument)
}
