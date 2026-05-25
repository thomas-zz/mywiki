import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

const AUTH_COOKIE = 'mywiki-auth'
const EXPIRE_DAYS = 7

function sign(expiry: string, secret: string): string {
  return createHmac('sha256', secret).update(expiry).digest('hex')
}

export async function POST(request: Request) {
  const authEnabled = process.env.AUTH_ENABLED !== 'false'
  if (!authEnabled) {
    return Response.json({ ok: true })
  }

  const secret = process.env.MYWIKI_PASSWORD
  if (!secret) {
    return Response.json({ ok: true })
  }

  const { password } = await request.json()

  if (password !== secret) {
    return Response.json({ ok: false, error: '密码错误' }, { status: 401 })
  }

  const expiry = `${Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000}`
  const token = `${expiry}.${sign(expiry, secret)}`

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
