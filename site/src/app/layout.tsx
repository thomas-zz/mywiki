import './globals.css'
import { buildWikiData } from '@/lib/parser'
import { Sidebar } from '@/components/Sidebar'
import { SearchBox } from '@/components/SearchBox'
import { HoverPopoverProvider } from '@/components/HoverPopover'
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
        <HoverPopoverProvider nodes={data.nodes}>
          <div className="flex min-h-screen">
            <Sidebar domains={domains} />
            <main className="flex-1 min-w-0 overflow-y-auto">
              <div className="sticky top-0 z-30 bg-white/80 backdrop-blur px-4 lg:px-[56px] py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <SearchBox nodes={data.nodes} />
              </div>
              <div className="px-4 lg:px-[56px] py-6 lg:py-8">
                {children}
              </div>
            </main>
          </div>
        </HoverPopoverProvider>
      </body>
    </html>
  )
}
