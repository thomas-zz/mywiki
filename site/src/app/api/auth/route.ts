import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const AUTH_COOKIE = 'mywiki-auth'
const EXPIRE_DAYS = 7

export async function POST(request: Request) {
  const authEnabled = process.env.AUTH_ENABLED !== 'false'
  if (!authEnabled) {
    return Response.json({ ok: true })
  }

  const { password } = await request.json()
  const correctPassword = process.env.AUTH_PASSWORD || 'wiki520'

  if (password !== correctPassword) {
    return Response.json({ ok: false, error: '密码错误' }, { status: 401 })
  }

  const expireMs = EXPIRE_DAYS * 24 * 60 * 60 * 1000
  const token = `${Date.now() + expireMs}`

  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRE_DAYS * 24 * 60 * 60,
  })

  return Response.json({ ok: true })
}
