import { NextResponse, NextRequest } from 'next/server'

const MOBILE_UA_RE = /(iphone|ipad|ipod|android|mobile|tablet|iemobile|blackberry|opera mini)/i

function isMobileRequest(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? ''
  const chMobile = req.headers.get('sec-ch-ua-mobile')
  return MOBILE_UA_RE.test(ua) || chMobile === '?1'
}

function isTestPath(pathname: string) {
  return (
    pathname.startsWith('/student') ||
    pathname.startsWith('/api/public/tests') ||
    pathname.startsWith('/api/submissions') ||
    pathname.startsWith('/api/proctor-event') ||
    pathname.startsWith('/api/test-session')
  )
}

export function middleware(req: NextRequest) {
  const url = new URL(req.url)
  if (isTestPath(url.pathname) && isMobileRequest(req)) {
    if (url.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Test faqat kompyuterda ishlaydi' }, { status: 403 })
    }
    return new NextResponse('Test faqat kompyuterda ishlaydi', { status: 403 })
  }
  if (url.pathname.startsWith('/teacher')) {
    const token = req.cookies.get('t_auth')?.value
    if (!token && !url.pathname.startsWith('/teacher/login')) {
      const loginUrl = new URL('/teacher/login', url.origin)
      loginUrl.searchParams.set('next', url.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/teacher/:path*',
    '/student/:path*',
    '/api/public/tests/:path*',
    '/api/submissions',
    '/api/proctor-event',
    '/api/test-session',
  ],
}
