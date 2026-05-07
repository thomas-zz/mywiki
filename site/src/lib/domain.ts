export function domainToSlug(domain: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(domain).toString('base64url')
  }
  return btoa(unescape(encodeURIComponent(domain))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function slugToDomain(slug: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(slug, 'base64url').toString()
  }
  const base64 = slug.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(base64)))
}
