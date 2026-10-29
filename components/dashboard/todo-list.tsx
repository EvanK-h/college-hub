"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Circle, Trash2, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { deleteTodo, restoreTodo, setTodoDone } from "@/app/(app)/actions";
import { AddTodoForm } from "@/components/dashboard/add-todo-form";
import { SwipeRow } from "@/components/swipe-row";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { daysBetween, formatCountdown } from "@/lib/dashboard/agenda";
import { cn } from "@/lib/utils";

export type DashboardTodo = { id: string; title: string; due_on: string | null; course: { code: string } | null };

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

// Ticking or deleting a to-do takes it off the list at once and says so in a toast with Undo,
// rather than asking first. The server catches up behind it. A row leaving fades while the rows
// below slide up into its place (popLayout), on the critically damped spring; reduced motion keeps
// only the fade. On touch screens a row also swipes: right for done, left to delete.
export function TodoList({
  todos,
  courses,
  today,
}: {
  todos: DashboardTodo[];
  courses: { id: string; code: string }[];
  today: string;
}) {
  const [shown, hide] = useOptimistic(todos, (current, id: string) => current.filter((todo) => todo.id !== id));
  const [, startTransition] = useTransition();
  const toast = useToast();

  function complete(todo: DashboardTodo) {
    startTransition(async () => {
      hide(todo.id);
      await setTodoDone(form({ todoId: todo.id, done: "true" }));
    });
    toast({
      message: `Done: ${todo.title}`,
      action: { label: "Undo", onAction: () => startTransition(() => setTodoDone(form({ todoId: todo.id, done: "false" }))) },
    });
  }

  function remove(todo: DashboardTodo) {
    startTransition(async () => {
      hide(todo.id);
      const row = await deleteTodo(form({ todoId: todo.id }));
      if (!row) return;
      toast({ message: `Deleted “${todo.title}”`, action: { label: "Undo", onAction: () => startTransition(() => restoreTodo(row)) } });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to do.</p>
      ) : (
        <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
          <ul className="relative flex flex-col gap-1">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((todo) => {
                const days = todo.due_on ? daysBetween(today, todo.due_on) : null;
                return (
                  <motion.li
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <SwipeRow
                      className="rounded-lg"
                      start={{ label: "Done", icon: <Check aria-hidden className="size-4" />, tone: "bg-status-done text-card", onSwipe: () => complete(todo) }}
                      end={{ label: "Delete", icon: <Trash2 aria-hidden className="size-4" />, tone: "bg-destructive text-destructive-foreground", onSwipe: () => remove(todo) }}
                    >
                      <div className="group flex items-start gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="hit-area mt-0.5"
                          aria-label={`Mark “${todo.title}” done`}
                          onClick={() => complete(todo)}
                        >
                          <Circle aria-hidden className="text-status-planned" />
                        </Button>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="leading-snug">{todo.title}</p>
                          {(todo.course || days !== null) && (
                            <p className={cn("text-xs", days !== null && days < 0 ? "text-status-overdue" : "text-tertiary-foreground")}>
                              {[todo.course?.code, days !== null && (days < 0 ? `${-days} d late` : formatCountdown(days))]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete “${todo.title}”`}
                          onClick={() => remove(todo)}
                          className="hit-area opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                          <X aria-hidden />
                        </Button>
                      </div>
                    </SwipeRow>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </MotionConfig>
      )}
      <AddTodoForm courses={courses} />
    </div>
  );
}
