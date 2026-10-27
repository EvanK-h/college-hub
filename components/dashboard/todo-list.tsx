import { Circle, X } from "lucide-react";
import { deleteTodo, setTodoDone } from "@/app/(app)/actions";
import { AddTodoForm } from "@/components/dashboard/add-todo-form";
import { Button } from "@/components/ui/button";
import { daysBetween, formatCountdown } from "@/lib/dashboard/agenda";
import { cn } from "@/lib/utils";

export type DashboardTodo = { id: string; title: string; due_on: string | null; course: { code: string } | null };

// Ticking a to-do is a one-field form posting to a Server Action, so it works before JavaScript loads.
export function TodoList({
  todos,
  courses,
  today,
}: {
  todos: DashboardTodo[];
  courses: { id: string; code: string }[];
  today: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {todos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to do.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {todos.map((todo) => {
            const days = todo.due_on ? daysBetween(today, todo.due_on) : null;
            return (
              <li key={todo.id} className="group flex items-start gap-2">
                <form action={setTodoDone}>
                  <input type="hidden" name="todoId" value={todo.id} />
                  <input type="hidden" name="done" value="true" />
                  <Button type="submit" variant="ghost" size="icon-xs" className="mt-0.5" aria-label={`Mark “${todo.title}” done`}>
                    <Circle aria-hidden className="text-status-planned" />
                  </Button>
                </form>
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
                <form action={deleteTodo}>
                  <input type="hidden" name="todoId" value={todo.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Delete “${todo.title}”`}
                    className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X aria-hidden />
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
      <AddTodoForm courses={courses} />
    </div>
  );
}
