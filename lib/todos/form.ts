import { z } from "zod";

// Everything the browser sends is untrusted, so the actions validate it with these schemas first.
// An empty select or date input arrives as "", which means "none".
const emptyAsNull = (value: unknown) => (value === "" || value === null ? null : value);

const newTodoSchema = z.object({
  title: z.string().trim().min(1, "Write what needs doing.").max(200, "Keep it under 200 characters."),
  courseId: z.preprocess(emptyAsNull, z.uuid().nullable()),
  dueOn: z.preprocess(emptyAsNull, z.iso.date().nullable()),
});

export type NewTodo = z.infer<typeof newTodoSchema>;

export function parseNewTodo(formData: FormData) {
  return newTodoSchema.safeParse({
    title: formData.get("title") ?? "",
    courseId: formData.get("courseId"),
    dueOn: formData.get("dueOn"),
  });
}

const todoToggleSchema = z.object({
  todoId: z.uuid(),
  done: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export function parseTodoToggle(formData: FormData) {
  return todoToggleSchema.safeParse({ todoId: formData.get("todoId"), done: formData.get("done") });
}

export function parseTodoId(formData: FormData) {
  return z.uuid().safeParse(formData.get("todoId"));
}
