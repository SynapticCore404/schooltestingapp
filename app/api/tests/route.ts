import { NextResponse } from 'next/server'
import { createTest, listTests, getSessionToken } from '@/lib/db'
import type { Option, Question } from '@/lib/types'
import { cookies } from 'next/headers'

export async function GET() {
  const authed = await isAuthed()
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tests = await listTests()
  return NextResponse.json({ tests })
}

export async function POST(req: Request) {
  const authed = await isAuthed()
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => null)
    const parsed = parseTestPayload(body)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const test = await createTest(parsed)
    return NextResponse.json({ test })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}

async function isAuthed() {
  const token = cookies().get('t_auth')?.value
  if (!token) return false
  const sessionToken = await getSessionToken()
  return !!sessionToken && token === sessionToken
}

const MAX_TITLE_LEN = 120
const MAX_SUBJECT_LEN = 80
const MAX_CLASS_LEN = 40
const MAX_QUESTIONS = 200
const MAX_OPTIONS = 10
const MAX_TEXT_LEN = 500
const MAX_OPTION_LEN = 200
const MAX_IMAGE_LEN = 500000

function toTrimmedString(value: unknown, maxLen: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLen) return null
  return trimmed
}

function toPositiveInt(value: unknown) {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) return null
  return num
}

function parseOptions(rawOptions: unknown): Option[] | null {
  if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > MAX_OPTIONS) {
    return null
  }
  const options: Option[] = []
  for (const raw of rawOptions) {
    if (!raw || typeof raw !== 'object') return null
    const option = raw as Record<string, unknown>
    const id = toTrimmedString(option.id, 8)
    const text = toTrimmedString(option.text, MAX_OPTION_LEN)
    if (!id || !text) return null
    options.push({ id, text })
  }
  return options
}

function parseOptionalImage(value: unknown) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length > MAX_IMAGE_LEN) return null
  return trimmed
}

function parseQuestions(rawQuestions: unknown): Question[] | null {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0 || rawQuestions.length > MAX_QUESTIONS) {
    return null
  }
  const questions: Question[] = []
  for (const raw of rawQuestions) {
    if (!raw || typeof raw !== 'object') return null
    const q = raw as Record<string, unknown>
    const id = toTrimmedString(q.id, 64)
    const text = toTrimmedString(q.text, MAX_TEXT_LEN)
    const answer = toTrimmedString(q.answer, 8)
    const points = toPositiveInt(q.points)
    const options = parseOptions(q.options)
    const image = parseOptionalImage(q.image)
    if (image === null) return null
    if (!id || !text || !answer || !points || !options) return null
    if (!options.some(o => o.id === answer)) return null
    const question: Question = { id, text, options, answer, points }
    if (image) question.image = image
    questions.push(question)
  }
  return questions
}

function parseTestPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const title = toTrimmedString(body.title, MAX_TITLE_LEN)
  const subject = toTrimmedString(body.subject, MAX_SUBJECT_LEN)
  const className = toTrimmedString(body.className, MAX_CLASS_LEN)
  const durationMinutes = toPositiveInt(body.durationMinutes)
  const questions = parseQuestions(body.questions)
  const published = typeof body.published === 'boolean' ? body.published : false
  if (!title || !subject || !className || !durationMinutes || !questions) return null
  return { title, subject, className, durationMinutes, questions, published }
}
