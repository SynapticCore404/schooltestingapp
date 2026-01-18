import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type {
  DB,
  Test,
  TestMeta,
  Question,
  Submission,
  SubmissionAnswer,
  TestSession,
  ProctorEvent,
  ProctorEventType,
  ProctorViolationReason,
  SubmissionStatus,
  RetakePermission,
} from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'db.json')
export const SESSION_TTL_SECONDS = 60 * 60 * 8
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000
export const MAX_VIOLATIONS = 0

function isSessionExpired(createdAt: string) {
  const createdMs = Date.parse(createdAt)
  if (!Number.isFinite(createdMs)) return true
  return Date.now() - createdMs > SESSION_TTL_MS
}

async function ensureDB() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(DB_PATH)
  } catch {
    const initial: DB = { tests: [], session: null, testSessions: [], proctorEvents: [], retakePermissions: [] }
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8')
  }
}

function defaultDB(): DB {
  return { tests: [], session: null, testSessions: [], proctorEvents: [], retakePermissions: [] }
}

function normalizeDB(db: DB): DB {
  if (!Array.isArray(db.tests)) db.tests = []
  if (!Array.isArray(db.testSessions)) db.testSessions = []
  if (!Array.isArray(db.proctorEvents)) db.proctorEvents = []
  if (!Array.isArray(db.retakePermissions)) db.retakePermissions = []
  if (db.session === undefined) db.session = null
  return db
}

async function readDB(): Promise<DB> {
  await ensureDB()
  const raw = await fs.readFile(DB_PATH, 'utf-8')
  if (!raw.trim()) {
    const initial = defaultDB()
    await writeDB(initial)
    return initial
  }
  try {
    const parsed = JSON.parse(raw) as DB
    return normalizeDB(parsed)
  } catch {
    const badPath = `${DB_PATH}.bad-${Date.now()}`
    try {
      await fs.rename(DB_PATH, badPath)
    } catch {}
    const initial = defaultDB()
    await writeDB(initial)
    return initial
  }
}

async function writeDB(db: DB) {
  const tmpPath = `${DB_PATH}.tmp`
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), 'utf-8')
  try {
    await fs.rename(tmpPath, DB_PATH)
  } catch {
    try {
      await fs.unlink(DB_PATH)
    } catch {}
    await fs.rename(tmpPath, DB_PATH)
  }
}

export async function listTests(): Promise<TestMeta[]> {
  const db = await readDB()
  return db.tests.map(t => ({
    id: t.id,
    title: t.title,
    subject: t.subject,
    className: t.className,
    durationMinutes: t.durationMinutes,
    published: t.published,
    createdAt: t.createdAt,
  }))
}

export async function getTestById(id: string): Promise<Test | null> {
  const db = await readDB()
  return db.tests.find(t => t.id === id) ?? null
}

export async function getPublicTestById(id: string) {
  const db = await readDB()
  const t = db.tests.find(test => test.id === id && test.published)
  if (!t) return null
  return {
    id: t.id,
    title: t.title,
    subject: t.subject,
    className: t.className,
    durationMinutes: t.durationMinutes,
    published: t.published,
    createdAt: t.createdAt,
    questions: t.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      points: q.points,
      image: q.image,
    })),
  }
}

export async function searchPublicTests(filters: { grade?: number; subject?: string }): Promise<TestMeta[]> {
  const db = await readDB()
  const normalize = (s?: string | null) => (s ?? '').trim().toLowerCase()
  const subj = normalize(filters.subject)
  const grade = filters.grade
  const extractGrade = (cls: string) => {
    const m = cls.trim().match(/^(\d{1,2})/)
    if (!m) return null
    const g = Number(m[1])
    return Number.isFinite(g) ? g : null
  }
  const res = db.tests.filter(t => {
    if (!t.published) return false
    if (typeof grade === 'number') {
      const tg = extractGrade(t.className)
      if (tg !== grade) return false
    }
    if (subj && normalize(t.subject) !== subj) return false
    return true
  })
  return res.map(t => ({
    id: t.id,
    title: t.title,
    subject: t.subject,
    className: t.className,
    durationMinutes: t.durationMinutes,
    published: t.published,
    createdAt: t.createdAt,
  }))
}

export async function createTest(input: { title: string; subject: string; className: string; durationMinutes: number; questions: Question[]; published?: boolean }): Promise<Test> {
  const db = await readDB()
  const id = randomUUID()
  const now = new Date().toISOString()
  const test: Test = {
    id,
    createdAt: now,
    published: input.published ?? false,
    title: input.title,
    subject: input.subject,
    className: input.className,
    durationMinutes: input.durationMinutes,
    questions: input.questions,
    submissions: [],
  }
  db.tests.push(test)
  await writeDB(db)
  return test
}

export async function updateTest(id: string, patch: Partial<Test>): Promise<Test | null> {
  const db = await readDB()
  const idx = db.tests.findIndex(t => t.id === id)
  if (idx === -1) return null
  const updated = { ...db.tests[idx], ...patch }
  db.tests[idx] = updated
  await writeDB(db)
  return updated
}

export async function deleteTest(id: string): Promise<boolean> {
  const db = await readDB()
  const before = db.tests.length
  db.tests = db.tests.filter(t => t.id !== id)
  await writeDB(db)
  return db.tests.length < before
}

export async function addSubmission(
  testId: string,
  data: {
    studentName: string
    studentClass: string
    answers: SubmissionAnswer[]
    startedAt?: string
    completedAt?: string
    status?: SubmissionStatus
    disqualifiedReason?: string | null
    studentId?: string
  }
): Promise<Submission | null> {
  const db = await readDB()
  const test = db.tests.find(t => t.id === testId)
  if (!test) return null

  const { score, maxScore } = grade(test, data.answers)

  const submission: Submission = {
    id: randomUUID(),
    testId,
    studentName: data.studentName,
    studentClass: data.studentClass,
    studentId: data.studentId ?? buildStudentId(data.studentName, data.studentClass),
    startedAt: data.startedAt && !Number.isNaN(Date.parse(data.startedAt)) ? new Date(data.startedAt).toISOString() : new Date().toISOString(),
    completedAt: data.completedAt && !Number.isNaN(Date.parse(data.completedAt)) ? new Date(data.completedAt).toISOString() : new Date().toISOString(),
    answers: data.answers,
    score,
    maxScore,
    status: data.status ?? 'COMPLETED',
    disqualifiedReason: data.disqualifiedReason ?? null,
  }

  test.submissions.push(submission)
  await writeDB(db)
  return submission
}

function grade(test: Test, answers: SubmissionAnswer[]) {
  const map = new Map<string, string | undefined>()
  for (const a of answers) map.set(a.questionId, a.choice ?? undefined)
  let score = 0
  let maxScore = 0
  for (const q of test.questions) {
    maxScore += q.points
    const choice = map.get(q.id)
    if (choice && choice === q.answer) {
      score += q.points
    }
  }
  if (score < 0) score = 0
  return { score, maxScore }
}

function normalizeIdentityPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function buildStudentId(studentName: string, studentClass: string) {
  const name = normalizeIdentityPart(studentName).replace(/\|/g, '-')
  const cls = normalizeIdentityPart(studentClass).replace(/\|/g, '-')
  const combined = `${name}|${cls}`
  return combined.length > 120 ? combined.slice(0, 120) : combined
}

function resolveSubmissionStudentId(submission: Submission) {
  if (submission.studentId) return submission.studentId
  return buildStudentId(submission.studentName, submission.studentClass)
}

function getLatestSubmission(submissions: Submission[]) {
  if (submissions.length === 0) return null
  return submissions
    .slice()
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0]
}

function findUnusedRetakePermission(db: DB, testId: string, studentId: string) {
  const permissions = db.retakePermissions ?? []
  return permissions.find(p => p.testId === testId && p.studentId === studentId && !p.usedAt) ?? null
}

export async function grantRetakePermission(input: { testId: string; studentId: string }) {
  const db = await readDB()
  const existing = findUnusedRetakePermission(db, input.testId, input.studentId)
  if (existing) return existing
  const permission: RetakePermission = {
    testId: input.testId,
    studentId: input.studentId,
    grantedAt: new Date().toISOString(),
    usedAt: null,
  }
  const permissions = db.retakePermissions ?? []
  permissions.push(permission)
  db.retakePermissions = permissions
  await writeDB(db)
  return permission
}

type SessionRecord = {
  db: DB
  sessions: TestSession[]
  session: TestSession
  index: number
}

function pickLatestSessionIndex(sessions: TestSession[], testId: string, studentId: string) {
  let bestIndex = -1
  let bestTime = 0
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i]
    if (s.testId !== testId || s.studentId !== studentId) continue
    const ts = Date.parse(s.lastSeenAt || s.startedAt)
    const time = Number.isFinite(ts) ? ts : 0
    if (time >= bestTime) {
      bestTime = time
      bestIndex = i
    }
  }
  return bestIndex
}

async function findSessionRecord(params: { sessionId?: string | null; testId?: string | null; studentId?: string | null }): Promise<SessionRecord | null> {
  const db = await readDB()
  const sessions = db.testSessions ?? []
  let index = -1
  if (params.sessionId) {
    index = sessions.findIndex(s => s.sessionId === params.sessionId)
  }
  if (index === -1 && params.testId && params.studentId) {
    index = pickLatestSessionIndex(sessions, params.testId, params.studentId)
  }
  if (index === -1) return null
  const session = sessions[index]
  if (params.testId && session.testId !== params.testId) return null
  if (params.studentId && session.studentId !== params.studentId) return null
  return { db, sessions, session, index }
}

export async function createTestSession(input: { testId: string; studentName: string; studentClass: string }): Promise<{ session?: TestSession; error?: string }> {
  const db = await readDB()
  const test = db.tests.find(t => t.id === input.testId)
  if (!test || !test.published) return { error: 'TEST_NOT_FOUND' }
  const studentId = buildStudentId(input.studentName, input.studentClass)
  const studentSubmissions = test.submissions.filter(s => resolveSubmissionStudentId(s) === studentId)
  const latestSubmission = getLatestSubmission(studentSubmissions)
  const hasDisqualifiedSession = (db.testSessions ?? []).some(
    s => s.testId === input.testId && s.studentId === studentId && s.status === 'DISQUALIFIED'
  )
  if (latestSubmission) {
    const status = (latestSubmission.status ?? 'COMPLETED') as SubmissionStatus
    if (status !== 'DISQUALIFIED') {
      return { error: 'RETAKE_NOT_ALLOWED' }
    }
    const permission = findUnusedRetakePermission(db, input.testId, studentId)
    if (!permission) {
      return { error: 'RETAKE_NOT_ALLOWED' }
    }
    permission.usedAt = new Date().toISOString()
  } else if (hasDisqualifiedSession) {
    const permission = findUnusedRetakePermission(db, input.testId, studentId)
    if (!permission) {
      return { error: 'RETAKE_NOT_ALLOWED' }
    }
    permission.usedAt = new Date().toISOString()
  }
  const now = new Date().toISOString()
  const session: TestSession = {
    sessionId: randomUUID(),
    testId: input.testId,
    studentId,
    studentName: input.studentName,
    studentClass: input.studentClass,
    status: 'ACTIVE',
    violationsCount: 0,
    disqualifiedReason: null,
    startedAt: now,
    endedAt: null,
    lastSeenAt: now,
  }
  const sessions = db.testSessions ?? []
  sessions.push(session)
  db.testSessions = sessions
  await writeDB(db)
  return { session }
}

export async function getTestSessionById(sessionId: string): Promise<TestSession | null> {
  const db = await readDB()
  const sessions = db.testSessions ?? []
  return sessions.find(s => s.sessionId === sessionId) ?? null
}

export async function getActiveTestSession(params: { sessionId?: string | null; testId?: string | null; studentId?: string | null }): Promise<TestSession | null> {
  const record = await findSessionRecord(params)
  if (!record) return null
  return record.session.status === 'ACTIVE' ? record.session : null
}

export async function recordProctorEvent(input: {
  sessionId?: string | null
  testId: string
  studentId: string
  type: ProctorEventType
  reason?: ProctorViolationReason | null
  timestamp: string
  meta?: Record<string, unknown>
}): Promise<TestSession | null> {
  const record = await findSessionRecord({
    sessionId: input.sessionId ?? null,
    testId: input.testId,
    studentId: input.studentId,
  })
  if (!record) return null
  const now = new Date().toISOString()
  const session = record.session
  if (session.status === 'ACTIVE') {
    session.lastSeenAt = now
    if (input.type === 'VIOLATION') {
      session.violationsCount += 1
      if (session.violationsCount > MAX_VIOLATIONS) {
        session.status = 'DISQUALIFIED'
        session.endedAt = now
        session.disqualifiedReason = input.reason ?? null
      }
    }
  } else {
    session.lastSeenAt = now
  }

  const events = record.db.proctorEvents ?? []
  events.push({
    sessionId: session.sessionId,
    testId: session.testId,
    studentId: session.studentId,
    type: input.type,
    reason: input.reason ?? null,
    timestamp: input.timestamp,
    meta: input.meta,
  })
  record.db.proctorEvents = events
  record.sessions[record.index] = session
  await writeDB(record.db)
  return session
}

export async function markSessionFinished(sessionId: string): Promise<TestSession | null> {
  const record = await findSessionRecord({ sessionId })
  if (!record) return null
  const now = new Date().toISOString()
  const session = record.session
  session.lastSeenAt = now
  if (session.status === 'ACTIVE') {
    session.status = 'FINISHED'
    session.endedAt = now
  }
  record.sessions[record.index] = session
  await writeDB(record.db)
  return session
}

export async function getSessionToken(): Promise<string | null> {
  const db = await readDB()
  const session = (db as DB).session
  if (!session?.token) return null
  if (isSessionExpired(session.createdAt)) {
    ;(db as DB).session = null
    await writeDB(db)
    return null
  }
  return session.token
}

export async function setSessionToken(token: string): Promise<void> {
  const db = await readDB()
  ;(db as DB).session = { token, createdAt: new Date().toISOString() }
  await writeDB(db)
}

export async function clearSessionToken(): Promise<void> {
  const db = await readDB()
  ;(db as DB).session = null
  await writeDB(db)
}

