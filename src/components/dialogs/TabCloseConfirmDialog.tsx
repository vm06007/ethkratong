import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabCloseConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for closing tabs with unsaved changes
 */
export function TabCloseConfirmDialog({ open, onOpenChange, onConfirm }: TabCloseConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%]",
            "rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl",
            "p-5 space-y-4",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Close this Kratong?
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                Unsaved changes will be lost. Do you wish to proceed?
              </Dialog.Description>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                No
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              Yes
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
