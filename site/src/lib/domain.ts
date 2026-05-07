export function domainToSlug(domain: string): string {
  return btoa(unescape(encodeURIComponent(domain))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function slugToDomain(slug: string): string {
  const base64 = slug.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(base64)))
}
