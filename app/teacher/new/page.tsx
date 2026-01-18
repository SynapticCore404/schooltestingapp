'use client'

import { useEffect, useState } from 'react'
import type { Question } from '@/lib/types'
import { useSearchParams } from 'next/navigation'

const MAX_IMAGE_BYTES = 300 * 1024

function newQuestion(): Question {
  const id = Math.random().toString(36).slice(2, 10)
  return {
    id,
    text: '',
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ],
    answer: 'A',
    points: 1,
  }
}

export default function NewTestPage() {
  const [title, setTitle] = useState('')
  const [grade, setGrade] = useState<number | ''>('')
  const [subject, setSubject] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [questions, setQuestions] = useState<Question[]>([newQuestion()])
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ id: string } | null>(null)

  const params = useSearchParams()
  useEffect(() => {
    const t = params.get('title')
    if (t) setTitle(t)
    const g = params.get('grade')
    const s = params.get('subject')
    if (g && !Number.isNaN(Number(g))) setGrade(Number(g))
    if (s) setSubject(s)
    const d = params.get('duration')
    if (d && !Number.isNaN(Number(d))) setDurationMinutes(Number(d))
  }, [params])

  const addQuestion = () => setQuestions(qs => [...qs, newQuestion()])
  const removeQuestion = (id: string) => setQuestions(qs => qs.filter(q => q.id !== id))
  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))
  }
  const updateOption = (qid: string, oid: string, text: string) => {
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, text } : o)} : q))
  }

  const handleSubmit = async () => {
    if (!title || typeof grade !== 'number' || !subject || questions.length === 0) return alert('Majburiy maydonlarni to‘ldiring')
    if (questions.some(q => !q.text || q.options.some(o => !o.text))) return alert('Savollar va variantlar to‘liq to‘ldirilishi kerak')
    const className = `${grade}-sinf`
    setSaving(true)
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
          title, subject, className,
          durationMinutes: Number(durationMinutes),
          questions,
          published: false,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Xatolik')
      setCreated({ id: data.test.id })
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (created) {
    return (
      <div className="card p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-brand-700">Test yaratildi</h1>
        <div className="flex gap-2">
          <a className="btn btn-primary" href={`/teacher/${created.id}`}>Test sahifasi</a>
          <a className="btn btn-outline" href="/teacher">Barcha testlar</a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand-700">Yangi test</h1>
        <button className="btn btn-primary" disabled={saving} onClick={handleSubmit}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Savollar</h2>
          </div>
          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Savol #{idx+1}</div>
                  <button className="text-red-600 text-sm" onClick={() => removeQuestion(q.id)}>O‘chirish</button>
                </div>
                <textarea
                  className="input min-h-[96px] resize-y wrap-anywhere"
                  value={q.text}
                  onChange={e => updateQuestion(q.id, { text: e.target.value })}
                  placeholder="Savol matni"
                  rows={3}
                />
                <div className="space-y-2">
                  <label className="label">Rasm (ixtiyoriy)</label>
                  <input
                    className="input"
                    type="url"
                    value={q.image && q.image.startsWith('data:') ? '' : q.image ?? ''}
                    onChange={e => updateQuestion(q.id, { image: e.target.value })}
                    placeholder="https://..."
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > MAX_IMAGE_BYTES) {
                          alert('Rasm hajmi 300KB dan oshmasin')
                          e.currentTarget.value = ''
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = () => {
                          const result = typeof reader.result === 'string' ? reader.result : ''
                          updateQuestion(q.id, { image: result })
                        }
                        reader.readAsDataURL(file)
                        e.currentTarget.value = ''
                      }}
                    />
                    {q.image ? (
                      <button className="btn btn-outline" onClick={() => updateQuestion(q.id, { image: '' })}>Rasmni o'chirish</button>
                    ) : null}
                  </div>
                  {q.image ? (
                    <img
                      src={q.image}
                      alt="Savol rasmi"
                      className="w-full max-h-64 object-contain rounded-lg border bg-white"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <div className="text-xs text-gray-500">Rasm URL yoki fayl (max 300KB)</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map(o => (
                    <div key={o.id} className="flex items-start gap-2">
                      <input type="radio" name={`ans-${q.id}`} checked={q.answer === o.id} onChange={() => updateQuestion(q.id, { answer: o.id })} />
                      <span className="text-sm text-gray-600 w-5">{o.id}.</span>
                      <textarea
                        className="input flex-1 min-w-0 w-auto resize-y wrap-anywhere"
                        value={o.text}
                        onChange={e => updateOption(q.id, o.id, e.target.value)}
                        placeholder={`Variant ${o.id}`}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                <div className="w-40">
                  <label className="label">Ball</label>
                  <input className="input" type="number" min={1} value={q.points} onChange={e => updateQuestion(q.id, { points: Number(e.target.value) })} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button className="btn btn-outline" onClick={addQuestion}>Savol qo‘shish</button>
          </div>
        </div>
      </div>
    </div>
  )
}
