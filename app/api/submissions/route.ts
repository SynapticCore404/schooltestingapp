import { NextResponse } from 'next/server'
import { addSubmission, buildStudentId, getTestById, getTestSessionById, markSessionFinished } from '@/lib/db'
import type { SubmissionAnswer } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const payload = body as Record<string, unknown>
    const testId = toTrimmedString(payload.testId, 64)
    const studentName = toTrimmedString(payload.studentName, 80)
    const studentClass = toTrimmedString(payload.studentClass, 40)
    const sessionId = toTrimmedString(payload.sessionId, 64)
    const studentId = toTrimmedString(payload.studentId, 120)
    const answers = parseAnswers(payload.answers)
    const startedAt = typeof payload.startedAt === 'string' ? payload.startedAt : undefined
    const completedAt = typeof payload.completedAt === 'string' ? payload.completedAt : undefined
    const statusRaw = typeof payload.status === 'string' ? payload.status.trim().toUpperCase() : ''
    if (!testId || !studentName || !studentClass || !answers || !sessionId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const test = await getTestById(testId)
    if (!test || !test.published) {
      return NextResponse.json({ error: 'Test mavjud emas yoki yopiq' }, { status: 400 })
    }
    const session = await getTestSessionById(sessionId)
    if (!session || session.testId !== testId) {
      return NextResponse.json({ error: 'Session topilmadi' }, { status: 401 })
    }
    const expectedStudentId = studentId ?? buildStudentId(studentName, studentClass)
    if (session.studentId !== expectedStudentId) {
      return NextResponse.json({ error: 'Session mos emas' }, { status: 401 })
    }
    const submissionStatus = statusRaw === 'DISQUALIFIED' ? 'DISQUALIFIED' : 'COMPLETED'
    if (submissionStatus === 'DISQUALIFIED' && session.status !== 'DISQUALIFIED') {
      return NextResponse.json({ error: 'Session disqualified emas' }, { status: 409 })
    }
    if (session.status === 'DISQUALIFIED') {
      if (submissionStatus !== 'DISQUALIFIED') {
        const reason = session.disqualifiedReason || 'VIOLATION'
        return NextResponse.json(
          {
            status: 'DISQUALIFIED',
            error: 'Test bekor qilindi',
            redirectUrl: `/test-ended?status=disqualified&reason=${encodeURIComponent(reason)}`,
          },
          { status: 409 }
        )
      }
    }
    if (session.status === 'FINISHED') {
      return NextResponse.json({ status: 'FINISHED', error: 'Test allaqachon yakunlangan' }, { status: 409 })
    }
    const validQuestionIds = new Set(test.questions.map(q => q.id))
    const filteredAnswers = answers.filter(a => validQuestionIds.has(a.questionId))
    const submission = await addSubmission(testId, {
      studentName,
      studentClass,
      answers: filteredAnswers,
      startedAt,
      completedAt,
      status: submissionStatus,
      disqualifiedReason: submissionStatus === 'DISQUALIFIED' ? session.disqualifiedReason ?? null : null,
      studentId: session.studentId,
    })
    if (!submission) return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
    if (submissionStatus === 'COMPLETED') {
      await markSessionFinished(sessionId)
    }
    return NextResponse.json({ submission })
  } catch (e) {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 })
  }
}

function toTrimmedString(value: unknown, maxLen: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLen) return null
  return trimmed
}

function parseAnswers(raw: unknown): SubmissionAnswer[] | null {
  if (!Array.isArray(raw)) return null
  const answers: SubmissionAnswer[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const answer = item as Record<string, unknown>
    const questionId = toTrimmedString(answer.questionId, 64)
    if (!questionId) return null
    const choiceRaw = answer.choice
    if (choiceRaw === null || choiceRaw === undefined) {
      answers.push({ questionId, choice: null })
      continue
    }
    if (typeof choiceRaw !== 'string') return null
    const choice = choiceRaw.trim()
    answers.push({ questionId, choice: choice || null })
  }
  return answers
}
