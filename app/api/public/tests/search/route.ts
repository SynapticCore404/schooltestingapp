import { NextResponse } from 'next/server'
import { searchPublicTests } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const gradeParam = searchParams.get('grade')
  const gradeNumber = gradeParam ? Number(gradeParam) : NaN
  const grade = Number.isInteger(gradeNumber) && gradeNumber > 0 ? gradeNumber : undefined
  const subjectRaw = searchParams.get('subject')
  const subject = subjectRaw ? subjectRaw.trim() : undefined
  const tests = await searchPublicTests({ grade, subject })
  return NextResponse.json({ tests })
}
