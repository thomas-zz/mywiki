export function domainToSlug(domain: string): string {
  return Buffer.from(domain).toString('base64url')
}

export function slugToDomain(slug: string): string {
  return Buffer.from(slug, 'base64url').toString()
}
