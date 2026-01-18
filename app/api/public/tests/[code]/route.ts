import { NextResponse } from 'next/server'
import { getPublicTestById } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const t = await getPublicTestById(params.code)
  if (!t) return NextResponse.json({ error: 'Test topilmadi yoki eʼlon qilinmagan' }, { status: 404 })
  return NextResponse.json({ test: t })
}
