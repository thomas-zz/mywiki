import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { HoverPopoverProvider } from '@/components/HoverPopover'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
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
  )
}
