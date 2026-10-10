import { TopBar } from './components/TopBar'
import { InputForm } from './components/InputForm'
import { ArticleEditor } from './components/ArticleEditor'
import { CoverPanel } from './components/CoverPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { OverwriteDialog } from './components/OverwriteDialog'
import { Toasts } from './components/Toasts'

/**
 * 三栏工作台（ADR-0003）：素材输入 ∥ 稿件编辑+封面 ∥ HTML 实时预览。
 * 宽屏（xl+）三栏常驻、各栏独立滚动、单屏尽收；窄屏纵向堆叠、整页滚动。
 */
export default function App() {
  return (
    <div className="min-h-full">
      <TopBar />

      <main className="mx-auto max-w-[1720px] px-4 pb-6 pt-20 xl:h-screen xl:pb-4">
        <div className="grid grid-cols-1 items-start gap-4 xl:h-full xl:grid-cols-12 xl:items-stretch">
          <div className="xl:col-span-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <InputForm />
          </div>
          <div className="flex flex-col gap-4 xl:col-span-5 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <ArticleEditor />
            <CoverPanel />
          </div>
          <div className="xl:col-span-4 xl:min-h-0 xl:overflow-y-auto">
            <PreviewPanel />
          </div>
        </div>
      </main>

      <OverwriteDialog />
      <Toasts />
    </div>
  )
}
