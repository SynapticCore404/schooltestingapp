type PageProps = {
  searchParams?: {
    status?: string
    reason?: string
  }
}

const REASON_LABELS: Record<string, string> = {
  TAB_HIDDEN: "Tab o'zgartirildi",
  WINDOW_BLUR: "Oyna fokusdan chiqdi",
  EXIT_FULLSCREEN: 'Fullscreen yopildi',
}

export default function TestEndedPage({ searchParams }: PageProps) {
  const status = (searchParams?.status || '').toLowerCase()
  const reason = (searchParams?.reason || '').toUpperCase()
  const isDisqualified = status === 'disqualified'
  const title = isDisqualified ? 'Test bekor qilindi' : 'Test yakunlandi'
  const reasonText = REASON_LABELS[reason] || (reason ? `Sabab: ${reason}` : null)

  return (
    <div className="card p-6 space-y-4 w-full">
      <h1 className="text-2xl font-semibold text-brand-700">{title}</h1>
      {isDisqualified ? (
        <p className="text-gray-700">
          Qoidabuzarlik aniqlangani uchun test yakunlandi.
        </p>
      ) : (
        <p className="text-gray-700">
          Test yakunlandi. Rahmat.
        </p>
      )}
      {reasonText ? <div className="text-sm text-gray-600">{reasonText}</div> : null}
      <a className="btn btn-primary" href="/student">Bosh sahifa</a>
    </div>
  )
}
