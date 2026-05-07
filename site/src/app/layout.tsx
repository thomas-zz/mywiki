import './globals.css'
import { buildWikiData } from '@/lib/parser'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { HoverPopoverProvider } from '@/components/HoverPopover'
import { WikiDataProvider } from '@/lib/WikiDataContext'
import { ClientOverrideView } from '@/components/ClientOverrideView'
import { domainToSlug } from '@/lib/domain'

export const metadata = {
  title: 'myWiki',
  description: '个人理解的镜子',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await buildWikiData()
  const domains = Object.keys(data.domainMap).sort().map(d => ({
    label: d, slug: domainToSlug(d), count: data.domainMap[d].length,
  }))

  return (
    <html lang="zh-CN">
      <body>
        <WikiDataProvider>
          <HoverPopoverProvider nodes={data.nodes}>
            <div className="flex min-h-screen">
              <Sidebar domains={domains} />
              <main className="flex-1 min-w-0 overflow-y-auto">
                <TopBar nodes={data.nodes} />
                <div className="px-4 lg:px-[56px] py-6 lg:py-8">
                  <ClientOverrideView>{children}</ClientOverrideView>
                </div>
              </main>
            </div>
          </HoverPopoverProvider>
        </WikiDataProvider>
      </body>
    </html>
  )
}
