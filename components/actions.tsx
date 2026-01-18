'use client'

import { useState } from 'react'

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn btn-outline text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export function DeleteButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      disabled={loading}
      className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
      onClick={async () => {
        if (!confirm('Testni o\'chirishni tasdiqlaysizmi?')) return
        setLoading(true)
        try {
          await fetch(`/api/tests/${id}`, { method: 'DELETE' })
          if (redirectTo) {
            location.href = redirectTo
          } else {
            location.reload()
          }
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'O\'chirilmoqda...' : "O'chirish"}
    </button>
  )
}

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      disabled={busy}
      className={`btn text-sm ${published ? 'btn-outline' : 'btn-primary'}`}
      onClick={async () => {
        setBusy(true)
        try {
          await fetch(`/api/tests/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: !published }),
          })
          location.reload()
        } finally {
          setBusy(false)
        }
      }}
    >
      {published ? 'Yopish' : 'Eʼlon qilish'}
    </button>
  )
}
