import './globals.css'
import { buildWikiData } from '@/lib/parser'
import { WikiDataProvider } from '@/lib/WikiDataContext'

export const metadata = {
  title: 'myWiki',
  description: '个人理解的镜子',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await buildWikiData()

  return (
    <html lang="zh-CN">
      <body>
        <WikiDataProvider serverData={data}>
          {children}
        </WikiDataProvider>
      </body>
    </html>
  )
}
