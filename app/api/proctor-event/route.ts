import { NextResponse } from 'next/server'
import { recordProctorEvent } from '@/lib/db'
import type { ProctorEventType, ProctorViolationReason } from '@/lib/types'

const MAX_TEST_ID = 64
const MAX_STUDENT_ID = 120
const MAX_SESSION_ID = 64

const EVENT_TYPES = new Set<ProctorEventType>([
  'VIOLATION',
  'ENTER_FULLSCREEN',
  'FOCUS_RETURNED',
  'PAGE_HIDE',
])

const VIOLATION_REASONS = new Set<ProctorViolationReason>([
  'TAB_HIDDEN',
  'WINDOW_BLUR',
  'EXIT_FULLSCREEN',
])

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const payload = body as Record<string, unknown>
  const testId = toTrimmedString(payload.testId, MAX_TEST_ID)
  const studentId = toTrimmedString(payload.studentId, MAX_STUDENT_ID)
  const sessionId = toTrimmedString(payload.sessionId, MAX_SESSION_ID)
  const type = typeof payload.type === 'string' ? payload.type.trim() : ''
  const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : ''
  const rawReason = typeof payload.reason === 'string' ? payload.reason.trim() : ''
  const meta = isPlainObject(payload.meta) ? payload.meta as Record<string, unknown> : undefined

  if (!testId || !studentId || !timestamp) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!EVENT_TYPES.has(type as ProctorEventType)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
  }
  const reason = rawReason && VIOLATION_REASONS.has(rawReason as ProctorViolationReason)
    ? rawReason as ProctorViolationReason
    : null
  if (type === 'VIOLATION' && !reason) {
    return NextResponse.json({ error: 'Invalid violation reason' }, { status: 400 })
  }

  const session = await recordProctorEvent({
    sessionId,
    testId,
    studentId,
    type: type as ProctorEventType,
    reason,
    timestamp,
    meta,
  })
  if (!session) {
    return NextResponse.json({ error: 'Session topilmadi' }, { status: 401 })
  }

  const response: Record<string, unknown> = {
    status: session.status,
    violationsCount: session.violationsCount,
  }
  if (session.status === 'DISQUALIFIED') {
    const reasonValue = session.disqualifiedReason || 'VIOLATION'
    response.reason = reasonValue
    response.redirectUrl = `/test-ended?status=disqualified&reason=${encodeURIComponent(reasonValue)}`
  }
  return NextResponse.json(response)
}

function toTrimmedString(value: unknown, maxLen: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLen) return null
  return trimmed
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  return Object.getPrototypeOf(value) === Object.prototype
}
