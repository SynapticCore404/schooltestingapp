import { NextResponse } from 'next/server'
import { getSessionToken } from '@/lib/db'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  const token = await getSessionToken()
  const cookieToken = cookies().get('t_auth')?.value
  const authed = !!token && !!cookieToken && token === cookieToken
  return NextResponse.json({ authed })
}
