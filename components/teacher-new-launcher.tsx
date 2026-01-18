'use client'

import { useState, type ChangeEvent } from 'react'
import { grades, subjectsByClass } from '@/lib/curriculum'

export default function NewTestLauncher() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [grade, setGrade] = useState<number | ''>('')
  const [subject, setSubject] = useState('')
  const [duration, setDuration] = useState<number | ''>(30)

  const subjects = typeof grade === 'number' ? (subjectsByClass[grade] ?? []) : []

  const go = () => {
    if (!title.trim()) {
      alert('Sarlavhani kiriting')
      return
    }
    if (typeof grade !== 'number') {
      alert('Sinfni tanlang')
      return
    }
    if (!subject.trim()) {
      alert('Fanni tanlang')
      return
    }
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      alert('Davomiyligini to‘g‘ri kiriting')
      return
    }
    const qs = new URLSearchParams({
      title: title.trim(),
      grade: String(grade),
      subject: subject.trim(),
      duration: String(duration),
    })
    window.location.href = `/teacher/new?${qs.toString()}`
  }

  return (
    <div className="relative">
      <button className="btn btn-primary" onClick={() => setOpen(o => !o)}>
        Yangi test
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 card p-4 space-y-3 z-20">
          <div className="text-sm font-medium">Test maʼlumotlarini kiriting</div>
          <div>
            <label className="label">Sarlavha</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Masalan: Algebra 7-sinf 1-chorak" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="label">Davomiyligi (daq.)</label>
            <input className="input" type="number" min={5} value={duration === '' ? '' : duration} onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const v = e.target.value ? Number(e.target.value) : ''
              setDuration(v)
            }} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" onClick={() => setOpen(false)}>Bekor qilish</button>
            <button className="btn btn-primary" onClick={go} disabled={!title.trim() || typeof grade !== 'number' || !subject.trim() || typeof duration !== 'number' || duration <= 0}>Davom etish</button>
          </div>
        </div>
      )}
    </div>
  )
}
