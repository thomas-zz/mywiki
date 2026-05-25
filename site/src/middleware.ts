import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'mywiki-auth'

async function verify(token: string, secret: string): Promise<boolean> {
  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) return false
  const expiry = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)
  const num = parseInt(expiry, 10)
  if (isNaN(num) || Date.now() > num) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expiry))
  const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')
  return sig === expected
}

export async function middleware(request: NextRequest) {
  const authEnabled = process.env.AUTH_ENABLED !== 'false'
  if (!authEnabled) return NextResponse.next()

  const secret = process.env.MYWIKI_PASSWORD
  if (!secret) return NextResponse.next()

  const { pathname } = request.nextUrl

  if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (!token || !(await verify(token, secret))) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
