import { defineConfig } from './site/src/lib/config'

export default defineConfig({
  contentDir: './content',
  site: {
    title: 'myWiki',
    tagline: '个人理解的镜子',
    owner: 'zzy',
  },
  auth: {
    enabled: true,
    provider: 'vercel-password',
  },
})
