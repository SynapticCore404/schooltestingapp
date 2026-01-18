import { NextResponse } from 'next/server'
import { createTestSession } from '@/lib/db'

const MAX_TEST_ID = 64
const MAX_NAME_LEN = 80
const MAX_CLASS_LEN = 40

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const payload = body as Record<string, unknown>
  const testId = toTrimmedString(payload.testId, MAX_TEST_ID)
  const studentName = toTrimmedString(payload.studentName, MAX_NAME_LEN)
  const studentClass = toTrimmedString(payload.studentClass, MAX_CLASS_LEN)
  if (!testId || !studentName || !studentClass) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const result = await createTestSession({ testId, studentName, studentClass })
  if (!result.session) {
    if (result.error === 'RETAKE_NOT_ALLOWED') {
      return NextResponse.json({ error: "Qayta topshirishga ruxsat yo'q" }, { status: 409 })
    }
    return NextResponse.json({ error: 'Test topilmadi yoki yopiq' }, { status: 404 })
  }
  const session = result.session
  return NextResponse.json({
    session: {
      sessionId: session.sessionId,
      testId: session.testId,
      studentId: session.studentId,
      status: session.status,
      violationsCount: session.violationsCount,
      startedAt: session.startedAt,
      lastSeenAt: session.lastSeenAt,
    },
  })
}

function toTrimmedString(value: unknown, maxLen: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLen) return null
  return trimmed
}
