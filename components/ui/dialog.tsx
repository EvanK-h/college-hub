"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import { project, rubberband } from "@/lib/motion/physics"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/30 transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/50",
        className
      )}
      {...props}
    />
  )
}

// How far down a sheet has to be heading (where the release velocity projects it, as a share
// of its height) to close rather than spring back.
const SHEET_CLOSE_AT = 0.5

/**
 * Drag-to-dismiss for the phone sheet, from its grabber. The sheet follows the finger 1:1
 * downward and with growing resistance upward; on release, the flick is projected forward
 * (Apple's `project`) to decide: past half its height it slides away and closes, otherwise it
 * springs back. Wider screens get the centred dialog, so the grabber is hidden there.
 */
function useSheetDrag(popupRef: React.RefObject<HTMLDivElement | null>, closeRef: React.RefObject<HTMLButtonElement | null>) {
  const drag = React.useRef<{ startY: number; samples: { y: number; t: number }[] } | null>(null)
  const offset = (event: React.PointerEvent) => event.clientY - (drag.current?.startY ?? event.clientY)

  return {
    onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      if (!popupRef.current || event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      popupRef.current.style.transition = "none"
      drag.current = { startY: event.clientY, samples: [{ y: event.clientY, t: event.timeStamp }] }
    },
    onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      const sheet = popupRef.current
      if (!sheet || !drag.current) return
      const dy = offset(event)
      sheet.style.translate = `0 ${dy >= 0 ? dy : rubberband(dy, sheet.offsetHeight)}px`
      drag.current.samples = [...drag.current.samples, { y: event.clientY, t: event.timeStamp }].filter((sample) => event.timeStamp - sample.t < 100)
    },
    onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
      const sheet = popupRef.current
      const current = drag.current
      drag.current = null
      if (!sheet || !current) return
      const dy = event.clientY - current.startY
      const first = current.samples[0]
      const elapsed = first ? event.timeStamp - first.t : 0
      const velocity = first && elapsed > 0 ? ((event.clientY - first.y) / elapsed) * 1000 : 0
      if (dy > 0 && dy + project(velocity) > sheet.offsetHeight * SHEET_CLOSE_AT) {
        sheet.style.transition = "translate 250ms ease-out"
        sheet.style.translate = "0 100%"
        closeRef.current?.click()
        return
      }
      sheet.style.transition = "translate 450ms var(--ease-spring)"
      sheet.style.translate = "0 0"
      // Hand the position back to the classes, so closing by other means still slides away.
      setTimeout(() => {
        sheet.style.transition = ""
        sheet.style.translate = ""
      }, 450)
    },
    onPointerCancel() {
      drag.current = null
      if (popupRef.current) {
        popupRef.current.style.transition = ""
        popupRef.current.style.translate = ""
      }
    },
  }
}

// A centred dialog from `sm` up; on a phone, a sheet from the bottom edge that slides up, with a
// grabber to drag it away (useSheetDrag). Both close with the ✕, Escape or the backdrop.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const popup = React.useRef<HTMLDivElement>(null)
  const close = React.useRef<HTMLButtonElement>(null)
  const drag = useSheetDrag(popup, close)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={popup}
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 grid w-full gap-5 bg-popover p-6 text-sm text-popover-foreground shadow-sheet outline-none",
          "max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:rounded-t-3xl max-sm:pt-2 max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-sm:transition-[translate] max-sm:duration-500 max-sm:ease-spring max-sm:data-starting-style:translate-y-full max-sm:data-ending-style:translate-y-full max-sm:data-ending-style:duration-250 max-sm:data-ending-style:ease-out",
          "sm:top-1/2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:transition-[scale,opacity,filter] sm:duration-500 sm:ease-spring sm:data-starting-style:scale-[0.94] sm:data-starting-style:opacity-0 sm:data-starting-style:blur-sm sm:data-ending-style:scale-[0.96] sm:data-ending-style:opacity-0 sm:data-ending-style:duration-200 sm:data-ending-style:ease-out",
          className
        )}
        {...props}
      >
        <div
          aria-hidden
          {...drag}
          className="-mx-6 -mb-3 flex h-6 cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-fill" />
        </div>
        {children}
        <DialogPrimitive.Close ref={close} tabIndex={-1} aria-hidden className="hidden" />
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4 bg-fill-secondary text-muted-foreground hover:bg-fill hover:text-foreground"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-title-3 pr-10",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
