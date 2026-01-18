export type Option = {
  id: string
  text: string
}

export type Question = {
  id: string
  text: string
  options: Option[]
  answer: string
  points: number
  image?: string
}

export type TestMeta = {
  id: string
  title: string
  subject: string
  className: string
  durationMinutes: number
  published: boolean
  createdAt: string
}

export type Test = TestMeta & {
  questions: Question[]
  submissions: Submission[]
}

export type SubmissionAnswer = {
  questionId: string
  choice?: string | null
}

export type SubmissionStatus = 'COMPLETED' | 'DISQUALIFIED'

export type Submission = {
  id: string
  testId: string
  studentName: string
  studentClass: string
  studentId?: string
  startedAt: string
  completedAt: string
  answers: SubmissionAnswer[]
  score: number
  maxScore: number
  status?: SubmissionStatus
  disqualifiedReason?: string | null
}

export type TestSessionStatus = 'ACTIVE' | 'DISQUALIFIED' | 'FINISHED'

export type ProctorEventType = 'VIOLATION' | 'ENTER_FULLSCREEN' | 'FOCUS_RETURNED' | 'PAGE_HIDE'
export type ProctorViolationReason = 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'EXIT_FULLSCREEN'

export type TestSession = {
  sessionId: string
  testId: string
  studentId: string
  studentName: string
  studentClass: string
  status: TestSessionStatus
  violationsCount: number
  disqualifiedReason?: ProctorViolationReason | null
  startedAt: string
  endedAt?: string | null
  lastSeenAt: string
}

export type ProctorEvent = {
  sessionId: string
  testId: string
  studentId: string
  type: ProctorEventType
  reason?: ProctorViolationReason | null
  timestamp: string
  meta?: Record<string, unknown>
}

export type RetakePermission = {
  testId: string
  studentId: string
  grantedAt: string
  usedAt?: string | null
}

export type DB = {
  tests: Test[]
  session?: {
    token: string
    createdAt: string
  } | null
  testSessions?: TestSession[]
  proctorEvents?: ProctorEvent[]
  retakePermissions?: RetakePermission[]
}
