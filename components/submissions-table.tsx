'use client'

import { useState, Fragment } from 'react'
import type { Test } from '@/lib/types'

export default function SubmissionsTable({ test }: { test: Test }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [retakeState, setRetakeState] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({})

  const dateFmt: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tashkent',
  }
  const formatDate = (iso: string) => new Date(iso).toLocaleString('uz-UZ', dateFmt)
  const reasonLabels: Record<string, string> = {
    TAB_HIDDEN: "Tab o'zgartirildi",
    WINDOW_BLUR: "Oyna fokusdan chiqdi",
    EXIT_FULLSCREEN: 'Fullscreen yopildi',
  }

  const buildStudentId = (name: string, cls: string) => {
    const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\|/g, '-')
    const combined = `${normalize(name)}|${normalize(cls)}`
    return combined.length > 120 ? combined.slice(0, 120) : combined
  }

  const allowRetake = async (studentId: string) => {
    const key = `${test.id}|${studentId}`
    if (retakeState[key] === 'loading' || retakeState[key] === 'done') return
    setRetakeState(prev => ({ ...prev, [key]: 'loading' }))
    try {
      const res = await fetch('/api/retakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id, studentId }),
      })
      if (!res.ok) {
        setRetakeState(prev => ({ ...prev, [key]: 'error' }))
        return
      }
      setRetakeState(prev => ({ ...prev, [key]: 'done' }))
    } catch {
      setRetakeState(prev => ({ ...prev, [key]: 'error' }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="p-2">Ism</th>
              <th className="p-2">Sinf</th>
              <th className="p-2">Ball</th>
              <th className="p-2">Holat</th>
              <th className="p-2">Boshlash</th>
              <th className="p-2">Tugatish</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {[...test.submissions]
              .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
              .map(s => {
                const status = (s.status ?? 'COMPLETED') as 'COMPLETED' | 'DISQUALIFIED'
                const reason = (s.disqualifiedReason ?? '').toUpperCase()
                const reasonLabel = reasonLabels[reason] || (reason ? `Sabab: ${reason}` : '')
                const studentId = s.studentId || buildStudentId(s.studentName, s.studentClass)
                const retakeKey = `${test.id}|${studentId}`
                const retakeStatus = retakeState[retakeKey] || 'idle'
                return (
                <Fragment key={s.id}>
                  <tr className="border-t">
                    <td className="p-2">{s.studentName}</td>
                    <td className="p-2">{s.studentClass}</td>
                    <td className="p-2">{s.score} / {s.maxScore}</td>
                    <td className="p-2">
                      {status === 'DISQUALIFIED' ? (
                        <div className="text-sm text-red-600">
                          Chetlashtirildi{reasonLabel ? ` (${reasonLabel})` : ''}
                        </div>
                      ) : (
                        <div className="text-sm text-green-700">Yakunlandi</div>
                      )}
                    </td>
                    <td className="p-2">{formatDate(s.startedAt)}</td>
                    <td className="p-2">{formatDate(s.completedAt)}</td>
                    <td className="p-2 text-right">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setOpenId(id => id === s.id ? null : s.id)}
                        >
                          {openId === s.id ? 'Yopish' : "Ko'rish"}
                        </button>
                        {status === 'DISQUALIFIED' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={retakeStatus === 'loading' || retakeStatus === 'done'}
                            onClick={() => allowRetake(studentId)}
                          >
                            {retakeStatus === 'done' ? 'Ruxsat berildi' : retakeStatus === 'loading' ? 'Yuborilmoqda...' : 'Qayta topshirish'}
                          </button>
                        ) : null}
                      </div>
                      {retakeStatus === 'error' ? (
                        <div className="text-xs text-red-600 mt-1">Xatolik</div>
                      ) : null}
                    </td>
                  </tr>
                {openId === s.id ? (
                  <tr className="bg-gray-50/40" key={`${s.id}-detail`}>
                    <td colSpan={7} className="p-3">
                      <SubmissionDetail test={test} submissionId={s.id} />
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              )})}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SubmissionDetail({ test, submissionId }: { test: Test; submissionId: string }) {
  const s = test.submissions.find(x => x.id === submissionId)!
  const ansMap = new Map<string, string | undefined>()
  s.answers.forEach(a => ansMap.set(a.questionId, a.choice ?? undefined))
  const status = (s.status ?? 'COMPLETED') as 'COMPLETED' | 'DISQUALIFIED'

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">
        {status === 'DISQUALIFIED' ? 'Holat: Chetlashtirildi' : 'Holat: Yakunlandi'}
      </div>
      {test.questions.map((q, idx) => {
        const choice = ansMap.get(q.id)
        const correct = choice && choice === q.answer
        const unanswered = !choice
        return (
          <div key={q.id} className={`rounded border p-3 ${correct ? 'border-green-300 bg-green-50/40' : unanswered ? 'border-gray-200' : 'border-red-300 bg-red-50/40'}`}>
            <div className="font-medium wrap-anywhere">#{idx + 1}. {q.text} <span className="text-xs text-gray-500">({q.points} ball)</span></div>
            {q.image ? (
              <img
                src={q.image}
                alt="Savol rasmi"
                className="w-full max-h-64 object-contain rounded-lg border bg-white mt-2"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-600">Talabaning javobi</div>
                <div className="font-mono wrap-anywhere">
                  {unanswered ? '—' : `${choice}. ${q.options.find(o => o.id === choice)?.text ?? ''}`}
                </div>
              </div>
              <div>
                <div className="text-gray-600">To‘g‘ri javob</div>
                <div className="font-mono wrap-anywhere">{q.answer}. {q.options.find(o => o.id === q.answer)?.text}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
