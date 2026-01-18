import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionToken, grantRetakePermission } from '@/lib/db'

const MAX_TEST_ID = 64
const MAX_STUDENT_ID = 120

export async function POST(req: Request) {
  const authed = await isAuthed()
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const payload = body as Record<string, unknown>
  const testId = toTrimmedString(payload.testId, MAX_TEST_ID)
  const studentId = toTrimmedString(payload.studentId, MAX_STUDENT_ID)
  if (!testId || !studentId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const permission = await grantRetakePermission({ testId, studentId })
  return NextResponse.json({ permission })
}

async function isAuthed() {
  const token = cookies().get('t_auth')?.value
  if (!token) return false
  const sessionToken = await getSessionToken()
  return !!sessionToken && token === sessionToken
}

function toTrimmedString(value: unknown, maxLen: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLen) return null
  return trimmed
}
