import { notFound, redirect } from 'next/navigation'
import { getTestById, getSessionToken } from '@/lib/db'
import { CopyButton, PublishToggle, DeleteButton } from '@/components/actions'
import SubmissionsTable from '@/components/submissions-table'
import { cookies, headers } from 'next/headers'

export default async function TestDetail({ params }: { params: { id: string } }) {
  const token = cookies().get('t_auth')?.value || ''
  const serverToken = await getSessionToken()
  if (!token || !serverToken || token !== serverToken) {
    redirect(`/teacher/login?next=/teacher/${params.id}`)
  }
  const headerList = headers()
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const test = await getTestById(params.id)
  if (!test) return notFound()
  const shareUrl = host ? `${protocol}://${host}/student/${test.id}` : `/student/${test.id}`
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-700">{test.title}</h1>
          <div className="text-gray-600">{test.subject} • {test.className}</div>
        </div>
        <div className="flex gap-2">
          <PublishToggle id={test.id} published={test.published} />
          <DeleteButton id={test.id} redirectTo="/teacher" />
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-sm text-gray-600">Davomiyligi: {test.durationMinutes} daqiqa</div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Ulashish</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-gray-600">Test havolasi</div>
            <div className="font-mono text-sm break-all">{shareUrl}</div>
            <div className="text-sm text-gray-600">Kod: <span className="font-mono">{test.id}</span></div>
          </div>
          <CopyButton text={shareUrl} label="Nusxa olish" />
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Savollar</h2>
        <div className="space-y-4">
          {test.questions.map((q, i) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-2">
              <div className="font-medium wrap-anywhere">#{i+1}. {q.text} <span className="text-xs text-gray-500">({q.points} ball)</span></div>
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
                  <div key={o.id} className={`flex items-start gap-2 px-3 py-2 rounded border w-full min-w-0 ${o.id === q.answer ? 'bg-green-50 border-green-300' : 'border-gray-200'}`}>
                    <span className="font-mono flex-shrink-0">{o.id}.</span>
                    <span className="wrap-anywhere">{o.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Natijalar</h2>
        {test.submissions.length === 0 ? (
          <div className="text-gray-600 text-sm">Hali topshirilgan javoblar yo‘q.</div>
        ) : (
          <SubmissionsTable test={test} />
        )}
      </div>
    </div>
  )
}
