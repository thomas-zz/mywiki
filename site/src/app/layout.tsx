import './globals.css'
import { buildWikiData, getWikiRootDir } from '@/lib/parser'
import { WikiDataProvider } from '@/lib/WikiDataContext'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'myWiki',
  description: '个人理解的镜子',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await buildWikiData()
  const wikiDir = getWikiRootDir()

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}})()` }} />
      </head>
      <body>
        <WikiDataProvider serverData={data} serverWikiDir={wikiDir}>
          {children}
        </WikiDataProvider>
      </body>
    </html>
  )
}
