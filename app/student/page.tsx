'use client'

import { useState, type ChangeEvent } from 'react'
import { grades, subjectsByClass } from '@/lib/curriculum'

type TestMeta = {
  id: string
  title: string
  subject: string
  className: string
  durationMinutes: number
  createdAt: string
  published: boolean
}

export default function StudentPage() {
  const [grade, setGrade] = useState<number | ''>('')
  const [subject, setSubject] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [tests, setTests] = useState<TestMeta[] | null>(null)
  const [searched, setSearched] = useState(false)

  const subjects = typeof grade === 'number' ? subjectsByClass[grade] ?? [] : []

  const search = async () => {
    if (typeof grade !== 'number' || !subject.trim()) {
      return alert('Avval sinf va fanni tanlang')
    }
    setLoading(true)
    setSearched(false)
    try {
      const qs = new URLSearchParams({ grade: String(grade), subject: subject.trim() })
      const res = await fetch(`/api/public/tests/search?${qs.toString()}`)
      const data = await res.json()
      setTests(data.tests || [])
    } catch {
      setTests([])
    } finally {
      setSearched(true)
      setLoading(false)
    }
  }
  return (
    <div className="space-y-6 w-full">
      <div className="card p-6 space-y-4 w-full">
        <h1 className="text-2xl font-semibold text-brand-700">Testni topish</h1>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Sinf</label>
            <select
              className="input"
              value={grade === '' ? '' : String(grade)}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value ? Number(e.target.value) : ''
                setGrade(v)
                setSubject('')
              }}
            >
              <option value="">Tanlang</option>
              {grades.map(g => (
                <option key={g} value={g}>{g}-sinf</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fan</label>
            <select
              className="input"
              value={subject}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSubject(e.target.value)}
              disabled={typeof grade !== 'number'}
            >
              <option value="">Tanlang</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading} onClick={search}>
          {loading ? 'Qidirilmoqda...' : 'Testlarni qidirish'}
        </button>
      </div>

      {searched && (
        <div className="space-y-3 w-full">
          {tests && tests.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {tests.map(t => (
                <div key={t.id} className="card p-5 space-y-2">
                  <div className="text-lg font-semibold">{t.title}</div>
                  <div className="text-sm text-gray-600">{t.subject} • {t.className}</div>
                  <div className="text-sm text-gray-600">Davomiyligi: {t.durationMinutes} daqiqa</div>
                  <div className="space-y-2">
                    <label className="label">Ism Familya</label>
                    <input className="input" value={fullName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} placeholder="Masalan: Azizbek Karimov" />
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (!fullName.trim()) return alert('Ism familyani kiriting')
                        const cls = typeof grade === 'number' ? `${grade}-sinf` : ''
                        const qs = new URLSearchParams({ name: fullName.trim(), class: cls })
                        window.location.href = `/student/${t.id}?${qs.toString()}`
                      }}
                    >
                      Boshlash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-700 card p-5 w-full">Test mavjud emas</div>
          )}
        </div>
      )}
    </div>
  )
}
