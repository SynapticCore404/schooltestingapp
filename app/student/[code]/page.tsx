'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type PublicTest = {
  id: string
  title: string
  subject: string
  className: string
  durationMinutes: number
  published: boolean
  createdAt: string
  questions: { id: string; text: string; options: { id: string; text: string }[]; points: number; image?: string }[]
}

type TestSessionState = {
  sessionId: string
  studentId: string
  status: 'ACTIVE' | 'DISQUALIFIED' | 'FINISHED'
  violationsCount: number
}

type ProctorEventType = 'VIOLATION' | 'ENTER_FULLSCREEN' | 'FOCUS_RETURNED' | 'PAGE_HIDE'
type ProctorViolationReason = 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'EXIT_FULLSCREEN'

export default function TakeTestPage({ params }: { params: { code: string } }) {
  const code = params.code
  const [loading, setLoading] = useState(true)
  const [test, setTest] = useState<PublicTest | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [studentName, setStudentName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({})
  const [submitted, setSubmitted] = useState<{ score: number; maxScore: number } | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [session, setSession] = useState<TestSessionState | null>(null)
  const [current, setCurrent] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const lastEventRef = useRef(0)
  const disqualifySentRef = useRef(false)

  const studentKey = useMemo(() => {
    const name = studentName.trim()
    const cls = studentClass.trim()
    if (!name || !cls) return null
    return `${name.toLowerCase()}|${cls.toLowerCase()}`
  }, [studentName, studentClass])

  const storageKeys = useMemo(() => {
    if (!test) return null
    return {
      start: `test-start-${test.id}`,
      submitted: `test-submitted-${test.id}`,
      identity: `test-student-${test.id}`,
      session: `test-session-${test.id}`,
    }
  }, [test])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const n = url.searchParams.get('name')
      const c = url.searchParams.get('class')
      if (n) setStudentName(n)
      if (c) setStudentClass(c)
    } catch {}
  }, [])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/public/tests/${code}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Test topilmadi')
        const t: PublicTest = data.test
        setTest(t)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [code])

  useEffect(() => {
    if (!storageKeys) return
    try {
      const savedIdentity = sessionStorage.getItem(storageKeys.identity)
      if (!studentKey) {
        setSubmitted(null)
        setStartTime(null)
        setSession(null)
        return
      }
      if (savedIdentity && savedIdentity !== studentKey) {
        sessionStorage.removeItem(storageKeys.start)
        sessionStorage.removeItem(storageKeys.submitted)
        sessionStorage.removeItem(storageKeys.session)
        setSubmitted(null)
        setStartTime(null)
        setSession(null)
        setAnswers({})
        setCurrent(0)
      }
      sessionStorage.setItem(storageKeys.identity, studentKey)

      const submittedRaw = sessionStorage.getItem(storageKeys.submitted)
      if (submittedRaw) {
        try {
          const parsed = JSON.parse(submittedRaw) as { score?: unknown; maxScore?: unknown; studentKey?: unknown }
          if (parsed.studentKey === studentKey && typeof parsed.score === 'number' && typeof parsed.maxScore === 'number') {
            setSubmitted({ score: parsed.score, maxScore: parsed.maxScore })
            setStartTime(null)
            return
          }
        } catch {}
      }
      let hasSession = false
      const sessionRaw = sessionStorage.getItem(storageKeys.session)
      if (sessionRaw) {
        try {
          const parsed = JSON.parse(sessionRaw) as { sessionId?: unknown; studentId?: unknown; status?: unknown; violationsCount?: unknown; studentKey?: unknown }
          if (
            parsed.studentKey === studentKey &&
            typeof parsed.sessionId === 'string' &&
            typeof parsed.studentId === 'string' &&
            typeof parsed.status === 'string' &&
            typeof parsed.violationsCount === 'number'
          ) {
            const status = parsed.status as TestSessionState['status']
            if (status !== 'ACTIVE') {
              sessionStorage.removeItem(storageKeys.start)
              sessionStorage.removeItem(storageKeys.session)
              setSession(null)
              setStartTime(null)
            } else {
              hasSession = true
              setSession({
                sessionId: parsed.sessionId,
                studentId: parsed.studentId,
                status,
                violationsCount: parsed.violationsCount,
              })
            }
          }
        } catch {}
      }
      const startRaw = sessionStorage.getItem(storageKeys.start)
      if (startRaw && hasSession) {
        try {
          const parsed = JSON.parse(startRaw) as { startTime?: unknown; studentKey?: unknown }
          if (parsed.studentKey === studentKey && typeof parsed.startTime === 'number' && Number.isFinite(parsed.startTime)) {
            setStartTime(parsed.startTime)
          }
        } catch {}
      }
    } catch {}
  }, [storageKeys, studentKey])

  useEffect(() => {
    if (!storageKeys || !studentKey) return
    try {
      if (submitted) {
        sessionStorage.setItem(storageKeys.submitted, JSON.stringify({ ...submitted, studentKey }))
        sessionStorage.removeItem(storageKeys.start)
        sessionStorage.removeItem(storageKeys.session)
      } else if (startTime) {
        sessionStorage.setItem(storageKeys.start, JSON.stringify({ startTime, studentKey }))
        if (session) {
          sessionStorage.setItem(storageKeys.session, JSON.stringify({ ...session, studentKey }))
        } else {
          sessionStorage.removeItem(storageKeys.session)
        }
      } else {
        sessionStorage.removeItem(storageKeys.start)
        sessionStorage.removeItem(storageKeys.session)
      }
    } catch {}
  }, [storageKeys, studentKey, startTime, submitted, session])

  const timeLeft = useMemo(() => {
    if (!startTime || !test) return null
    const now = Date.now()
    const end = startTime + test.durationMinutes * 60_000
    return Math.max(0, end - now)
  }, [startTime, test, answers])

  const answeredCount = useMemo(() => {
    if (!test) return 0
    return test.questions.reduce((acc, q) => acc + (answers[q.id] ? 1 : 0), 0)
  }, [answers, test])

  useEffect(() => {
    if (!startTime) return
    const id = setInterval(() => {
      setAnswers(a => ({ ...a }))
    }, 1000)
    return () => clearInterval(id)
  }, [startTime])

  const requestFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return true
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
      msRequestFullscreen?: () => Promise<void> | void
    }
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen
    if (!request) return false
    try {
      await request.call(el)
      return true
    } catch {
      return false
    }
  }, [])

  const submitDisqualified = useCallback(
    async (reason?: string) => {
      if (!test || !session || disqualifySentRef.current) return
      disqualifySentRef.current = true
      try {
        if (storageKeys) {
          sessionStorage.removeItem(storageKeys.start)
          sessionStorage.removeItem(storageKeys.session)
        }
      } catch {}
      try {
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: test.id,
            studentName,
            studentClass,
            sessionId: session.sessionId,
            studentId: session.studentId,
            status: 'DISQUALIFIED',
            disqualifiedReason: reason || null,
            answers: test.questions.map(q => ({ questionId: q.id, choice: answers[q.id] || null })),
            startedAt: startTime ? new Date(startTime).toISOString() : undefined,
            completedAt: new Date().toISOString(),
          }),
          keepalive: true,
        })
      } catch {}
    },
    [answers, session, startTime, storageKeys, studentClass, studentName, test]
  )

  const sendProctorEvent = useCallback(
    async (type: ProctorEventType, reason?: ProctorViolationReason, meta?: Record<string, unknown>) => {
      if (!session || !test) return
      const now = Date.now()
      if (now - lastEventRef.current < 400) return
      lastEventRef.current = now
      try {
        const res = await fetch('/api/proctor-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: test.id,
            studentId: session.studentId,
            sessionId: session.sessionId,
            type,
            reason,
            timestamp: new Date().toISOString(),
            meta,
          }),
          keepalive: true,
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) return
        if (typeof data.violationsCount === 'number' || typeof data.status === 'string') {
          setSession(prev => {
            if (!prev) return prev
            return {
              ...prev,
              violationsCount: typeof data.violationsCount === 'number' ? data.violationsCount : prev.violationsCount,
              status: typeof data.status === 'string' ? data.status as TestSessionState['status'] : prev.status,
            }
          })
        }
        if (data.status === 'DISQUALIFIED' && typeof data.redirectUrl === 'string') {
          const reasonValue = typeof data.reason === 'string' ? data.reason : undefined
          submitDisqualified(reasonValue)
          window.location.href = data.redirectUrl
        }
      } catch {}
    },
    [session, submitDisqualified, test]
  )

  const startTest = useCallback(async () => {
    if (!test || isStarting || startTime) return
    if (!studentName.trim() || !studentClass.trim()) {
      alert('Ism familya va sinfni kiriting')
      return
    }
    setFullscreenError(null)
    disqualifySentRef.current = false
    lastEventRef.current = 0
    const ok = await requestFullscreen()
    if (!ok) {
      setFullscreenError('Fullscreen talab qilinadi')
      return
    }
    setIsStarting(true)
    try {
      const res = await fetch('/api/test-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: test.id,
          studentName,
          studentClass,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Xatolik')
        return
      }
      const created = data.session
      if (!created?.sessionId || !created?.studentId) {
        alert('Session topilmadi')
        return
      }
      setSession({
        sessionId: created.sessionId,
        studentId: created.studentId,
        status: created.status || 'ACTIVE',
        violationsCount: typeof created.violationsCount === 'number' ? created.violationsCount : 0,
      })
      setStartTime(Date.now())
    } catch {
      alert('Xatolik')
    } finally {
      setIsStarting(false)
    }
  }, [test, isStarting, startTime, studentName, studentClass, requestFullscreen])

  useEffect(() => {
    if (!session || !test || !startTime || submitted || session.status !== 'ACTIVE') return

    const onVisibility = () => {
      if (document.hidden) {
        sendProctorEvent('VIOLATION', 'TAB_HIDDEN')
      } else {
        sendProctorEvent('FOCUS_RETURNED')
      }
    }
    const onBlur = () => {
      sendProctorEvent('VIOLATION', 'WINDOW_BLUR')
    }
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        sendProctorEvent('ENTER_FULLSCREEN')
      } else {
        sendProctorEvent('VIOLATION', 'EXIT_FULLSCREEN')
      }
    }
    const onPageHide = (event: PageTransitionEvent) => {
      sendProctorEvent('PAGE_HIDE', undefined, { persisted: event.persisted })
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('pagehide', onPageHide)

    const initialCheck = window.setTimeout(() => {
      if (!document.fullscreenElement) {
        sendProctorEvent('VIOLATION', 'EXIT_FULLSCREEN')
      }
    }, 500)

    return () => {
      window.clearTimeout(initialCheck)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [session, test, startTime, submitted, sendProctorEvent])

  const timeUp = !!startTime && (timeLeft ?? 0) <= 0
  const disabledUI = isSubmitting || timeUp || session?.status === 'DISQUALIFIED'

  const onSubmit = async () => {
    if (!test) return
    if (isSubmitting || submitted) return
    if (!studentName || !studentClass) return alert('Ism va sinfni kiriting')
    if (!session) {
      alert('Session topilmadi')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        testId: test.id,
        studentName,
        studentClass,
        sessionId: session.sessionId,
        studentId: session.studentId,
        answers: test.questions.map(q => ({ questionId: q.id, choice: answers[q.id] || null })),
        startedAt: startTime ? new Date(startTime).toISOString() : undefined,
        completedAt: new Date().toISOString(),
      }
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.status === 'DISQUALIFIED' && typeof data.redirectUrl === 'string') {
          window.location.href = data.redirectUrl
          return
        }
        alert(data.error || 'Xatolik')
        return
      }
      setSubmitted({ score: data.submission.score, maxScore: data.submission.maxScore })
    } catch (e) {
      alert('Xatolik')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!startTime || !test) return
    if (timeUp && !submitted && !isSubmitting) {
      onSubmit()
    }
  }, [timeUp, startTime, test, submitted, isSubmitting])

  if (loading) return <div className="text-gray-600">Yuklanmoqda...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!test) return null

  if (submitted) {
    return (
      <div className="card p-6 space-y-4 w-full">
        <h1 className="text-2xl font-semibold text-brand-700">Natija</h1>
        <div className="text-lg">Ball: {submitted.score} / {submitted.maxScore}</div>
        <a className="btn btn-primary" href="/student">Bosh sahifa</a>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      <div className="card p-5 space-y-2 w-full">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-brand-700">{test.title}</h1>
            <div className="text-gray-600">{test.subject} • {test.className}</div>
          </div>
          {startTime ? (
            <div className="text-right space-y-1">
              <div className="text-sm text-gray-600">Qolgan vaqt</div>
              <div className="text-lg font-mono">
                {(() => {
                  const ms = timeLeft ?? 0
                  const m = Math.floor(ms / 60000)
                  const s = Math.floor((ms % 60000) / 1000)
                  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                })()}
              </div>
              <div className="text-xs text-gray-600">Javoblar: {answeredCount}/{test.questions.length}</div>
            </div>
          ) : null}
        </div>
      </div>

      {!startTime ? (
        <div className="card p-5 space-y-3 w-full">
          {studentName && studentClass ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Ism Familya</div>
              <div className="font-medium">{studentName}</div>
              <div className="text-sm text-gray-600">Sinf</div>
              <div className="font-medium">{studentClass}</div>
            </div>
          ) : (
            <>
              <div>
                <label className="label">Ismingiz</label>
                <input className="input" value={studentName} onChange={e => setStudentName(e.target.value)} />
              </div>
              <div>
                <label className="label">Sinf</label>
                <input className="input" value={studentClass} onChange={e => setStudentClass(e.target.value)} />
              </div>
            </>
          )}
          {fullscreenError ? (
            <div className="text-sm text-red-600">{fullscreenError}</div>
          ) : null}
          <button
            className="btn btn-primary"
            disabled={isStarting}
            onClick={startTest}
          >
            {isStarting ? 'Boshlanmoqda...' : 'Boshlash'}
          </button>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          {timeUp ? (
            <div className="p-3 rounded border border-yellow-200 bg-yellow-50 text-yellow-800">
              Vaqt tugadi. {isSubmitting ? 'Javoblar yuborilmoqda...' : 'Endi belgilash mumkin emas.'}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {test.questions.map((q, i) => {
              const answered = !!answers[q.id]
              return (
                <button
                  key={q.id}
                  className={`w-9 h-9 rounded text-sm border flex items-center justify-center ${i === current ? 'border-brand-600 bg-brand-50' : 'border-gray-300'} ${answered ? 'text-brand-700' : 'text-gray-600'}`}
                  disabled={disabledUI}
                  onClick={() => setCurrent(i)}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          {(() => {
            const q = test.questions[current]
            return (
              <div key={q.id} className="card p-4 space-y-2 w-full">
                <div className="font-medium wrap-anywhere">#{current+1}. {q.text} <span className="text-xs text-gray-500">({q.points} ball)</span></div>
                {q.image ? (
                  <img
                    src={q.image}
                    alt="Savol rasmi"
                    className="w-full max-h-80 object-contain rounded-lg border bg-white"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map(o => (
                    <label key={o.id} className={`flex items-start gap-2 border rounded px-3 py-2 cursor-pointer w-full min-w-0 ${answers[q.id] === o.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
                      <input className="mt-0.5" type="radio" name={`q-${q.id}`} checked={answers[q.id] === o.id} disabled={disabledUI} onChange={() => setAnswers(a => ({ ...a, [q.id]: o.id }))} />
                      <span className="font-mono flex-shrink-0">{o.id}.</span>
                      <span className="wrap-anywhere">{o.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })()}

          <div className="flex items-center justify-between">
            <button
              className="btn btn-outline"
              disabled={current === 0 || disabledUI}
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
            >
              Oldingi
            </button>
            {current < test.questions.length - 1 ? (
              <button className="btn btn-primary" disabled={disabledUI} onClick={() => setCurrent(c => Math.min(test.questions.length - 1, c + 1))}>Keyingi</button>
            ) : (
              <button className="btn btn-primary" disabled={disabledUI} onClick={onSubmit}>Yakunlash</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
