import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import LogoutButton from '@/components/logout-button'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Maktab Test | Teacher & Student Testing App',
  description: "O'qituvchilar uchun test tuzish, o'quvchilar uchun onlayn topshirish",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = !!cookies().get('t_auth')?.value
  return (
    <html lang="uz">
      <body className={inter.className}>
        <div className="min-h-dvh flex flex-col">
          <header className="border-b bg-white/80 backdrop-blur">
            <div className="container-max flex items-center justify-between py-4">
              <a href="/" className="flex items-center gap-2 font-semibold text-brand-700">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L2 9l10 6 10-6-10-6Z" className="fill-brand-500/20" />
                  <path d="M2 15l10 6 10-6" className="stroke-brand-600" strokeWidth="1.5"/>
                </svg>
                <span>MaktabTest</span>
              </a>
              <nav className="flex items-center gap-2">
                <a href="/student" className="btn btn-outline">O'quvchi</a>
                <a href="/teacher" className="btn btn-primary">O'qituvchi</a>
                {authed ? <LogoutButton /> : null}
              </nav>
            </div>
          </header>
          <main className="container-max py-8 flex-1">
            {children}
          </main>
          <footer className="py-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} MaktabTest
          </footer>
        </div>
      </body>
    </html>
  )
}
