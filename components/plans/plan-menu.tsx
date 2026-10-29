"use client";

import { useActionState, useState, useTransition } from "react";
import { Menu } from "@base-ui/react/menu";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { deletePlan, renamePlan, type PlanFormState } from "@/app/(app)/pathway/plans/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const IDLE: PlanFormState = { status: "idle", message: "" };
const ITEM_CLASS =
  "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-fill-secondary";

// A plan row's ⋯ menu: the less frequent actions (Rename, Delete), so the row itself stays one
// link and one Compare button. Each item opens its own dialog.
export function PlanMenu({ plan }: { plan: { id: string; name: string } }) {
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`More for ${plan.name}`}
          className="press flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-fill-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-popup-open:bg-fill-secondary"
        >
          <Ellipsis aria-hidden className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="min-w-36 origin-(--transform-origin) rounded-xl bg-popover p-1 text-popover-foreground shadow-sheet transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Menu.Item className={ITEM_CLASS} onClick={() => setDialog("rename")}>
                <Pencil aria-hidden className="size-4 text-muted-foreground" />
                Rename
              </Menu.Item>
              <Menu.Item className={`${ITEM_CLASS} text-destructive`} onClick={() => setDialog("delete")}>
                <Trash2 aria-hidden className="size-4" />
                Delete
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <RenameDialog plan={plan} open={dialog === "rename"} onClose={() => setDialog(null)} />
      <DeleteDialog plan={plan} open={dialog === "delete"} onClose={() => setDialog(null)} />
    </>
  );
}

function RenameDialog({ plan, open, onClose }: { plan: { id: string; name: string }; open: boolean; onClose: () => void }) {
  // Close once the name is saved; an error keeps the dialog open to show it.
  async function save(previous: PlanFormState, formData: FormData) {
    const result = await renamePlan(previous, formData);
    if (result.status === "saved") onClose();
    return result;
  }
  const [state, formAction, pending] = useActionState(save, IDLE);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename “{plan.name}”</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="planId" value={plan.id} />
          <div className="grid gap-1.5">
            <Label htmlFor={`rename-${plan.id}`}>Name</Label>
            <Input id={`rename-${plan.id}`} name="name" defaultValue={plan.name} required maxLength={60} aria-describedby={`rename-error-${plan.id}`} />
          </div>
          <p id={`rename-error-${plan.id}`} role="alert" className="text-sm text-destructive empty:hidden">
            {state.status === "error" ? state.message : ""}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ plan, open, onClose }: { plan: { id: string; name: string }; open: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{plan.name}”?</DialogTitle>
          <DialogDescription>The what-if plan is deleted. Your real plan is not changed.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => startTransition(() => deletePlan(plan.id))}>
            {pending ? "Deleting…" : "Delete plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
