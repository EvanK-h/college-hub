"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// A button that asks before running a server action: deleting a plan, or making it the real
// plan. The action may redirect; if it returns an error message instead, the dialog shows it.
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  destructive = false,
  action,
  children,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<{ status: string; message: string } | void>;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(null);
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant={destructive ? "outline" : "default"} />}>{label}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action();
                if (result && result.status === "error") setError(result.message);
              })
            }
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
