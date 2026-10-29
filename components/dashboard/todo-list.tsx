"use client";

import { useOptimistic, useTransition } from "react";
import { Circle, X } from "lucide-react";
import { deleteTodo, restoreTodo, setTodoDone } from "@/app/(app)/actions";
import { AddTodoForm } from "@/components/dashboard/add-todo-form";
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
// rather than asking first. The server catches up behind it.
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
        <ul className="flex flex-col gap-1">
          {shown.map((todo) => {
            const days = todo.due_on ? daysBetween(today, todo.due_on) : null;
            return (
              <li key={todo.id} className="group flex items-start gap-2">
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
              </li>
            );
          })}
        </ul>
      )}
      <AddTodoForm courses={courses} />
    </div>
  );
}
