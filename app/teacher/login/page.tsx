'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export default function TeacherLoginPage() {
  const [password, setPassword] = useState('')
  const [passwordLength, setPasswordLength] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextPath, setNextPath] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const inFlightRef = useRef(false)
  const lastAttemptRef = useRef<string | null>(null)

  const isLocked = lockUntil !== null && now < lockUntil
  const remainingSeconds = lockUntil ? Math.max(0, Math.ceil((lockUntil - now) / 1000)) : 0

  const lockStateKey = useMemo(() => 'teacher-login-lock', [])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const n = url.searchParams.get('next')
      if (n) setNextPath(n)
    } catch {}
  }, [])

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/auth/login')
        const data = await res.json().catch(() => ({}))
        if (res.ok && typeof data.length === 'number' && data.length > 0) {
          setPasswordLength(data.length)
        } else {
          setError(data.error || 'Parol uzunligini olishda xatolik')
        }
      } catch {
        setError('Parol uzunligini olishda xatolik')
      }
    }
    run()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lockStateKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { attempts?: unknown; lockUntil?: unknown }
      if (typeof parsed.attempts === 'number') setAttempts(parsed.attempts)
      if (typeof parsed.lockUntil === 'number') setLockUntil(parsed.lockUntil)
    } catch {}
  }, [lockStateKey])

  useEffect(() => {
    if (!lockUntil) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [lockUntil])

  useEffect(() => {
    if (lockUntil && now >= lockUntil) {
      setLockUntil(null)
      try {
        localStorage.setItem(lockStateKey, JSON.stringify({ attempts, lockUntil: null }))
      } catch {}
    }
  }, [lockUntil, now, attempts, lockStateKey])

  const recordFailure = () => {
    const nextAttempts = attempts + 1
    let nextLockUntil: number | null = null
    if (nextAttempts >= 3) {
      const waitSeconds = (nextAttempts - 2) * 10
      nextLockUntil = Date.now() + waitSeconds * 1000
    }
    setAttempts(nextAttempts)
    setLockUntil(nextLockUntil)
    try {
      localStorage.setItem(lockStateKey, JSON.stringify({ attempts: nextAttempts, lockUntil: nextLockUntil }))
    } catch {}
  }

  const clearFailures = () => {
    setAttempts(0)
    setLockUntil(null)
    try {
      localStorage.removeItem(lockStateKey)
    } catch {}
  }

  const onSubmit = async (passwordOverride?: string) => {
    if (loading || isLocked || !passwordLength) return
    const candidate = passwordOverride ?? password
    if (candidate.length !== passwordLength) return
    if (inFlightRef.current) return
    if (lastAttemptRef.current === candidate) return
    inFlightRef.current = true
    lastAttemptRef.current = candidate
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: candidate }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Noto'g'ri parol")
      }
      clearFailures()
      window.location.href = nextPath || '/teacher'
    } catch (e) {
      setError((e as Error).message)
      recordFailure()
      setPassword('')
      lastAttemptRef.current = null
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-4 w-full">
      <h1 className="text-2xl font-semibold text-brand-700">O'qituvchi kirishi</h1>
      {passwordLength ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              className="absolute inset-0 w-full h-full opacity-0"
              type="password"
              inputMode="text"
              autoComplete="current-password"
              value={password}
              onChange={e => {
                if (!passwordLength) return
                const next = e.target.value.slice(0, passwordLength)
                setPassword(next)
                setError(null)
                if (next.length < passwordLength) {
                  lastAttemptRef.current = null
                  return
                }
                if (!loading && !isLocked) {
                  onSubmit(next)
                }
              }}
              disabled={loading || isLocked}
              autoFocus
            />
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${passwordLength}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: passwordLength }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 rounded-lg border flex items-center justify-center text-lg font-mono ${password[i] ? 'bg-white' : 'bg-gray-50'} ${isLocked ? 'opacity-60' : ''}`}
                >
                  {password[i] ? '*' : ''}
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-500">Parol kiritilganda avtomatik kiriladi.</div>
        </div>
      ) : (
        <div className="text-sm text-gray-600">Yuklanmoqda...</div>
      )}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {isLocked ? (
        <div className="text-sm text-yellow-700">Iltimos, {remainingSeconds} soniya kuting.</div>
      ) : null}
    </div>
  )
}
