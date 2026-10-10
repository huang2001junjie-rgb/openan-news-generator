import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { useWorkflow } from '../stores/workflow'

/** 覆盖保护：已有稿件时，生成/重新生成先经确认（ADR-0003） */
export function OverwriteDialog() {
  const pending = useWorkflow((s) => s.pendingGeneration)
  const confirmPendingGeneration = useWorkflow((s) => s.confirmPendingGeneration)
  const cancelPendingGeneration = useWorkflow((s) => s.cancelPendingGeneration)

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && cancelPendingGeneration()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber" />
            覆盖当前稿件？
          </DialogTitle>
          <DialogDescription>
            重新生成将覆盖编辑栏中的当前稿件（含手动修改），封面不受影响。此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={cancelPendingGeneration}>
            取消
          </Button>
          <Button onClick={confirmPendingGeneration}>覆盖并生成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
