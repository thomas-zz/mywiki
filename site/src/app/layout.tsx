import './globals.css'
import { buildWikiData } from '@/lib/parser'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { HoverPopoverProvider } from '@/components/HoverPopover'
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
          <HoverPopoverProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 min-w-0 overflow-y-auto">
                <TopBar />
                <div className="px-4 lg:px-[56px] py-6 lg:py-8">
                  {children}
                </div>
              </main>
            </div>
          </HoverPopoverProvider>
        </WikiDataProvider>
      </body>
    </html>
  )
}
