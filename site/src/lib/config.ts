export interface WikiConfig {
  wikiDir: string
  site: {
    title: string
    tagline: string
    owner: string
  }
  auth: {
    enabled: boolean
    provider: 'vercel-password' | 'cloudflare-access'
  }
}

export function defineConfig(config: WikiConfig): WikiConfig {
  return config
}
