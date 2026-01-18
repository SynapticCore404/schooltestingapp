import { NextResponse } from 'next/server'
import { clearSessionToken } from '@/lib/db'

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true })
  const protocol = (() => { try { return new URL(req.url).protocol } catch { return 'http:' } })()
  res.cookies.set('t_auth', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: protocol === 'https:',
    path: '/',
    maxAge: 0,
  })
  await clearSessionToken()
  return res
}
