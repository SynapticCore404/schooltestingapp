import Link from 'next/link'
import { listTests } from '@/lib/db'
import { DeleteButton, PublishToggle } from '@/components/actions'
import NewTestLauncher from '@/components/teacher-new-launcher'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionToken } from '@/lib/db'

export default async function TeacherPage() {
  const token = cookies().get('t_auth')?.value || ''
  const serverToken = await getSessionToken()
  if (!token || !serverToken || token !== serverToken) {
    redirect('/teacher/login?next=/teacher')
  }
  const tests = await listTests()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-brand-700">Testlar</h1>
        <NewTestLauncher />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {tests.length === 0 ? (
          <div className="text-gray-600">Hozircha testlar yo'q. Yangi test yarating.</div>
        ) : tests.map(t => (
          <div key={t.id} className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{t.title}</div>
                <div className="text-sm text-gray-600">{t.subject} • {t.className}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${t.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {t.published ? 'Eʼlon qilingan' : 'Qoralama'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href={`/teacher/${t.id}`} className="btn btn-outline text-sm">Ko‘rish</Link>
              <PublishToggle id={t.id} published={t.published} />
              <DeleteButton id={t.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
