import { FieldValue, Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { db } from './firebase.js'

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'duplicate_ignored'
export type PaymentMethod = 'UPI' | 'Card'

export type FailureType =
  | 'Network Lost After Request Sent'
  | 'Timeout Before Response'
  | 'Partial Response Received'

export type FailurePoint =
  | 'Between Customer and Merchant'
  | 'Between PSP and Bank'
  | 'Between Bank and PSP (response)'

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
  failureType: FailureType | null
  failurePoint: FailurePoint | null
  createdAt: Timestamp
  events: TransactionEvent[]
}

export interface NewTransactionInput {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status?: TransactionStatus
  failureType?: FailureType | null
  failurePoint?: FailurePoint | null
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
  const createdAt = Timestamp.now()

  // The simulator processes these steps synchronously, so they're logged as
  // real events right away rather than left for the frontend to fabricate.
  const initialEvents: TransactionEvent[] = [
    { step: 'payment_initiated', detail: `Customer initiates payment of ₹${data.amount}`, timestamp: Timestamp.now() },
    { step: 'request_sent_to_psp', detail: 'Request sent to PSP', timestamp: Timestamp.now() },
    { step: 'request_forwarded_to_bank', detail: 'Request forwarded to Bank', timestamp: Timestamp.now() },
    { step: 'bank_approved', detail: 'Bank approves the transaction', timestamp: Timestamp.now() },
  ]

  const doc: TransactionDocument = {
    idempotencyKey: data.idempotencyKey,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    status: data.status ?? 'pending',
    failureType: data.failureType ?? null,
    failurePoint: data.failurePoint ?? null,
    createdAt,
    events: initialEvents,
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

export async function setFailureConfig(
  idempotencyKey: string,
  config: { failureType: FailureType | null; failurePoint: FailurePoint | null },
): Promise<void> {
  await requireDb()
    .collection(COLLECTION)
    .doc(idempotencyKey)
    .update({ failureType: config.failureType, failurePoint: config.failurePoint })
}

export async function setTransactionStatus(idempotencyKey: string, status: TransactionStatus): Promise<void> {
  await requireDb().collection(COLLECTION).doc(idempotencyKey).update({ status })
}

export async function getAllTransactions(): Promise<TransactionDocument[]> {
  const snap = await requireDb().collection(COLLECTION).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as TransactionDocument)
}
