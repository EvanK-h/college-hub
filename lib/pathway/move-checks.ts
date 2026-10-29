// Checks for moving a course to another term, used by the drag-and-drop pathway before a move is
// saved. Pure functions over the plan, so the rules are tested in one place.
//
// Prerequisites are an AND of OR-groups (see the course_prereqs migration): every group needs one
// of its codes. A prerequisite must sit in an earlier term; a corequisite in the same term or
// earlier. Terms are ordered by id, and transfer credit (id 0) comes before everything.

export type TermKind = "transfer" | "semester" | "summer" | "coop";

export type PlanTerm = { id: number; name: string; kind: TermKind };
// `coop`: the course may sit in a co-op term (its type says so; see course_types.coop).
export type PlanCourse = { id: string; code: string; credits: number; coop: boolean; termId: number };
// "recommended" links are advice for the graph; the checks below only look at prereq and coreq.
export type PlanPrereq = { courseId: string; requiresCode: string; kind: "prereq" | "coreq" | "recommended"; group: number };

/** Most credits a term of each kind may hold, from the profile; a missing kind has no limit. */
export type CreditLimits = Partial<Record<TermKind, number>>;

export type MoveProblem =
  | { kind: "missing_prereq"; options: string[] }
  | { kind: "missing_coreq"; options: string[] }
  | { kind: "breaks_dependent"; course: string; requirement: "prereq" | "coreq" }
  | { kind: "coop_term" }
  | { kind: "over_limit"; total: number; limit: number };

/** Groups a course's requirement rows by kind and group: each inner list is one "any of these". */
function groupsFor(prereqs: readonly PlanPrereq[], courseId: string, kind: "prereq" | "coreq"): string[][] {
  const groups = new Map<number, string[]>();
  for (const row of prereqs) {
    if (row.courseId !== courseId || row.kind !== kind) continue;
    groups.set(row.group, [...(groups.get(row.group) ?? []), row.requiresCode]);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([, codes]) => codes);
}

/** Is some code of `group` placed in a term that satisfies `ok` (given the term's id)? */
function groupMet(group: readonly string[], termOf: ReadonlyMap<string, number>, ok: (termId: number) => boolean): boolean {
  return group.some((code) => {
    const termId = termOf.get(code);
    return termId !== undefined && ok(termId);
  });
}

/** Problems with `course`'s own requirements if it sits in `termId`, given where everything else is. */
function ownProblems(course: PlanCourse, termId: number, termOf: ReadonlyMap<string, number>, prereqs: readonly PlanPrereq[]): MoveProblem[] {
  const problems: MoveProblem[] = [];
  for (const group of groupsFor(prereqs, course.id, "prereq")) {
    if (!groupMet(group, termOf, (t) => t < termId)) problems.push({ kind: "missing_prereq", options: group });
  }
  for (const group of groupsFor(prereqs, course.id, "coreq")) {
    if (!groupMet(group, termOf, (t) => t <= termId)) problems.push({ kind: "missing_coreq", options: group });
  }
  return problems;
}

/**
 * Everything wrong with moving `courseId` to `toTermId`: its own unmet requirements, courses
 * that depend on it and would break, a co-op term, and the target term's credit limit. An empty list
 * means the move is fine.
 */
export function checkMove(
  { terms, courses, prereqs, limits = {} }: { terms: readonly PlanTerm[]; courses: readonly PlanCourse[]; prereqs: readonly PlanPrereq[]; limits?: CreditLimits },
  courseId: string,
  toTermId: number,
): MoveProblem[] {
  const course = courses.find((c) => c.id === courseId);
  const target = terms.find((t) => t.id === toTermId);
  if (!course || !target) return [];

  // The plan as it would be after the move.
  const moved = courses.map((c) => (c.id === courseId ? { ...c, termId: toTermId } : c));
  const termOf = new Map(moved.map((c) => [c.code, c.termId]));

  const problems = ownProblems(course, toTermId, termOf, prereqs);

  // Courses whose requirement groups were met before the move and are not after it.
  const before = new Map(courses.map((c) => [c.code, c.termId]));
  for (const other of moved) {
    if (other.id === courseId) continue;
    for (const kind of ["prereq", "coreq"] as const) {
      const ok = (t: number) => (kind === "prereq" ? t < other.termId : t <= other.termId);
      const broken = groupsFor(prereqs, other.id, kind).some(
        (group) => group.includes(course.code) && groupMet(group, before, ok) && !groupMet(group, termOf, ok),
      );
      if (broken) problems.push({ kind: "breaks_dependent", course: other.code, requirement: kind });
    }
  }

  if (target.kind === "coop" && !course.coop) problems.push({ kind: "coop_term" });

  const limit = limits[target.kind];
  const total = moved.filter((c) => c.termId === toTermId).reduce((sum, c) => sum + c.credits, 0);
  if (limit !== undefined && total > limit) problems.push({ kind: "over_limit", total, limit });

  return problems;
}

/** One sentence per problem, for showing under the course before the move is saved. */
export function describeProblem(problem: MoveProblem, termName: string, creditUnit = "credits"): string {
  const anyOf = (codes: string[]) => (codes.length === 1 ? codes[0] : `one of ${codes.join(", ")}`);
  switch (problem.kind) {
    case "missing_prereq":
      return `Needs ${anyOf(problem.options)} in an earlier term.`;
    case "missing_coreq":
      return `Needs ${anyOf(problem.options)} in ${termName} or earlier.`;
    case "breaks_dependent":
      return `${problem.course} needs this ${problem.requirement === "prereq" ? "in an earlier term" : "in the same term or earlier"}.`;
    case "coop_term":
      return `${termName} is a co-op term.`;
    case "over_limit":
      return `${termName} would have ${problem.total} ${creditUnit}, over the ${problem.limit} ${creditUnit} limit.`;
  }
}

export type PlanProblem = { termId: number; courseCode?: string; problem: MoveProblem };

/**
 * Everything wrong with a plan as it stands, for comparing plans: each course's own unmet
 * requirements, courses in co-op terms, and terms over their credit limit. A broken dependent shows
 * up as the dependent's own missing requirement, so it isn't listed twice.
 */
export function planProblems({
  terms,
  courses,
  prereqs,
  limits = {},
}: {
  terms: readonly PlanTerm[];
  courses: readonly PlanCourse[];
  prereqs: readonly PlanPrereq[];
  limits?: CreditLimits;
}): PlanProblem[] {
  const termOf = new Map(courses.map((c) => [c.code, c.termId]));
  const problems: PlanProblem[] = [];
  for (const term of terms) {
    const inTerm = courses.filter((c) => c.termId === term.id);
    for (const course of inTerm) {
      for (const problem of ownProblems(course, term.id, termOf, prereqs)) problems.push({ termId: term.id, courseCode: course.code, problem });
      if (term.kind === "coop" && !course.coop) problems.push({ termId: term.id, courseCode: course.code, problem: { kind: "coop_term" } });
    }
    const total = inTerm.reduce((sum, c) => sum + c.credits, 0);
    const limit = limits[term.kind];
    if (limit !== undefined && total > limit) problems.push({ termId: term.id, problem: { kind: "over_limit", total, limit } });
  }
  return problems;
}

export type PrereqCheck = { kind: "prereq" | "coreq"; options: string[]; met: boolean };

/** Each of a course's prerequisite and corequisite groups, and whether the plan as it stands meets it. */
export function prereqChecks(
  { courses, prereqs }: { courses: readonly PlanCourse[]; prereqs: readonly PlanPrereq[] },
  courseId: string,
): PrereqCheck[] {
  const course = courses.find((c) => c.id === courseId);
  if (!course) return [];
  const termOf = new Map(courses.map((c) => [c.code, c.termId]));
  return (["prereq", "coreq"] as const).flatMap((kind) =>
    groupsFor(prereqs, courseId, kind).map((options) => ({
      kind,
      options,
      met: groupMet(options, termOf, (t) => (kind === "prereq" ? t < course.termId : t <= course.termId)),
    })),
  );
}
