"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { X } from "lucide-react";

export type ToastInput = {
  message: string;
  /** One action, usually Undo. Pressing it runs `onAction` and dismisses the toast. */
  action?: { label: string; onAction: () => void };
};
type Toast = ToastInput & { id: number };

// How long a toast stays; one with an action stays a little longer, so there's time to undo.
const SHOW_MS = 4000;
const SHOW_WITH_ACTION_MS = 6000;

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** Shows a toast: `toast({ message: "Deleted “Read ch. 3”", action: { label: "Undo", onAction } })`. */
export function useToast() {
  return useContext(ToastContext);
}

// One toast at a time, bottom centre, on the translucent material: it confirms something just
// happened and offers Undo, so actions can happen at once instead of asking first. A new toast
// replaces the old one. It stays while the pointer is on it or focus is in it, and is announced
// politely to screen readers. On a phone it sits above the tab bar.
export function Toaster({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [held, setHeld] = useState(false);
  const next = useRef(0);

  const show = useCallback((input: ToastInput) => {
    next.current += 1;
    setToast({ ...input, id: next.current });
  }, []);

  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(() => setToast(null), toast.action ? SHOW_WITH_ACTION_MS : SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast, held]);

  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:bottom-6"
      >
        <MotionConfig reducedMotion="user">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                role="status"
                // Rises from below and leaves the same way; reduced motion keeps only the fade.
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                onPointerEnter={() => setHeld(true)}
                onPointerLeave={() => setHeld(false)}
                onFocus={() => setHeld(true)}
                onBlur={() => setHeld(false)}
                className="material-bar pointer-events-auto flex max-w-md items-center gap-1 rounded-2xl py-1.5 pr-1.5 pl-4 text-sm font-medium shadow-sheet ring-1 ring-separator"
              >
                <span className="min-w-0 flex-1 py-1">{toast.message}</span>
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onAction();
                      setToast(null);
                      setHeld(false);
                    }}
                    className="press rounded-full px-3 py-1 font-semibold text-primary hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => {
                    setToast(null);
                    setHeld(false);
                  }}
                  className="press flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-fill-tertiary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionConfig>
      </div>
    </ToastContext>
  );
}
