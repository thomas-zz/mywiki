import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

export async function isAuthorized(): Promise<boolean> {
  const secret = process.env.MYWIKI_PASSWORD
  if (!secret || process.env.AUTH_ENABLED === 'false') return true
  const cookieStore = await cookies()
  const token = cookieStore.get('mywiki-auth')?.value
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const expiry = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (isNaN(Number(expiry)) || Date.now() > Number(expiry)) return false
  const expected = createHmac('sha256', secret).update(expiry).digest('hex')
  return sig === expected
}
