import { NextResponse } from 'next/server'
import { deleteTest, getTestById, updateTest, getSessionToken } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const authed = await isAuthed()
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const test = await getTestById(params.id)
  if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ test })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authed = await isAuthed()
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const keys = Object.keys(body)
  if (keys.length !== 1 || !('published' in body) || typeof (body as Record<string, unknown>).published !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const updated = await updateTest(params.id, { published: (body as { published: boolean }).published })
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ test: updated })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const authed = await isAuthed()
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ok = await deleteTest(params.id)
  return NextResponse.json({ ok })
}

async function isAuthed() {
  const token = cookies().get('t_auth')?.value
  if (!token) return false
  const sessionToken = await getSessionToken()
  return !!sessionToken && token === sessionToken
}
