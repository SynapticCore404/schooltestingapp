'use client'

import { useState } from 'react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  return (
    <button
      className="btn btn-outline"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
          window.location.href = '/teacher/login'
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Chiqilmoqda...' : 'Chiqish'}
    </button>
  )
}
