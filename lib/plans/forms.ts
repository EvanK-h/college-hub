import { z } from "zod";

// Everything the browser sends is untrusted, so plan actions validate it here first.

const planNameSchema = z.string().trim().min(1, "Give the plan a name.").max(60, "Keep the name under 60 characters.");

const newPlanSchema = z.object({
  name: planNameSchema,
  // "current" copies the real plan; otherwise the id of the plan to copy.
  from: z.union([z.literal("current"), z.uuid()]),
});

export function parseNewPlan(formData: FormData) {
  return newPlanSchema.safeParse({ name: formData.get("name"), from: formData.get("from") ?? "current" });
}

const renamePlanSchema = z.object({ planId: z.uuid(), name: planNameSchema });

export function parseRenamePlan(formData: FormData) {
  return renamePlanSchema.safeParse({ planId: formData.get("planId"), name: formData.get("name") });
}

// A board id is a course id, or "swap:<swap option id>" for a swap taken in.
const itemIdSchema = z.union([z.uuid(), z.string().regex(/^swap:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)]);

const planMoveSchema = z.object({ planId: z.uuid(), courseId: itemIdSchema, termId: z.number().int().min(0) });

export function parsePlanMove(input: unknown) {
  return planMoveSchema.safeParse(input);
}

// The swap form sends one value per choice: "<swap option id>:<id of the course it replaces>".
const swapChoiceSchema = z.string().transform((value, ctx) => {
  const [swapOptionId, courseId] = value.split(":");
  const ids = z.object({ swapOptionId: z.uuid(), courseId: z.uuid() }).safeParse({ swapOptionId, courseId });
  if (!ids.success) {
    ctx.addIssue({ code: "custom", message: "Choose a swap." });
    return z.NEVER;
  }
  return ids.data;
});

const planSwapSchema = z.object({ planId: z.uuid(), choice: swapChoiceSchema });

export function parsePlanSwap(formData: FormData) {
  return planSwapSchema.safeParse({ planId: formData.get("planId"), choice: formData.get("choice") });
}

/** The swaps page's "Try in a what-if plan": just the choice, since the plan is made for it. */
export function parseSwapChoice(formData: FormData) {
  return swapChoiceSchema.safeParse(formData.get("choice"));
}

/** "current" or a plan id, from the compare page's query string; null for anything else. */
export function parsePlanRef(value: string | string[] | undefined): "current" | string | null {
  const ref = z.union([z.literal("current"), z.uuid()]).safeParse(value);
  return ref.success ? ref.data : null;
}
