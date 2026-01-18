import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { setSessionToken, SESSION_TTL_SECONDS } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const configured = typeof process.env.TEACHER_PASSWORD === 'string' && process.env.TEACHER_PASSWORD.length > 0
  if (!configured && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Server sozlanmagan' }, { status: 500 })
  }
  const expected = configured ? process.env.TEACHER_PASSWORD as string : 'teacher123'
  return NextResponse.json({ length: expected.length })
}

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }))
  const configured = typeof process.env.TEACHER_PASSWORD === 'string' && process.env.TEACHER_PASSWORD.length > 0
  if (!configured && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Server sozlanmagan' }, { status: 500 })
  }
  const expected = configured ? process.env.TEACHER_PASSWORD as string : 'teacher123'
  if (typeof password === 'string' && password === expected) {
    const res = NextResponse.json({ ok: true })
    const protocol = (() => { try { return new URL(req.url).protocol } catch { return 'http:' } })()
    const token = randomUUID()
    await setSessionToken(token)
    res.cookies.set('t_auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: protocol === 'https:',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })
    return res
  }
  return NextResponse.json({ error: 'Noto‘g‘ri parol' }, { status: 401 })
}
