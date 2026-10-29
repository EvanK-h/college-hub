// The prerequisite graph, laid out by the plan itself: one column per term, left to right, so an
// arrow should always point right (or stay in its column, for a corequisite). Pure functions, so
// the layout and the "which arrows are wrong" rule are tested in one place.
import type { CourseStatus } from "./labels";
import type { PlanPrereq } from "./move-checks";

// `color`: the course type's palette colour (see lib/setup/setup.ts).
export type GraphCourse = { id: string; code: string; title: string; color: number; status: CourseStatus; termId: number };
export type GraphTerm = { id: number; name: string };

export type GraphNode = GraphCourse & { column: number; row: number };
export type GraphEdge = {
  id: string;
  from: string; // the required course
  to: string; // the course that needs it
  kind: PlanPrereq["kind"];
  /** One of several courses that would each do (an "or" group with more than one choice in the plan). */
  alternative: boolean;
  /** The plan has this the wrong way round: a prerequisite not in an earlier term, a corequisite in a later one. */
  problem: boolean;
};

export type PrereqGraph = {
  columns: GraphTerm[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Requirement groups with no course in the plan at all, per course id (e.g. a placement). */
  unmet: Map<string, string[]>;
};

/**
 * Builds the graph from the plan. Only courses with at least one link are drawn, and only terms
 * holding such a course get a column. Within a column, courses are ordered by the average row of
 * what they need (a one-pass barycentre heuristic), which keeps most arrows short and uncrossed.
 */
export function buildPrereqGraph(terms: readonly GraphTerm[], courses: readonly GraphCourse[], prereqs: readonly PlanPrereq[]): PrereqGraph {
  const byCode = new Map(courses.map((course) => [course.code, course]));
  const byId = new Map(courses.map((course) => [course.id, course]));
  const edges: GraphEdge[] = [];
  const unmet = new Map<string, string[]>();

  const groups = new Map<string, PlanPrereq[]>();
  for (const row of prereqs) {
    const key = `${row.courseId}|${row.kind}|${row.group}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  for (const rows of groups.values()) {
    const target = byId.get(rows[0]?.courseId ?? "");
    if (!target) continue;
    const present = rows.filter((row) => byCode.has(row.requiresCode));
    if (present.length === 0) {
      if (rows[0]?.kind !== "recommended") unmet.set(target.id, [...(unmet.get(target.id) ?? []), rows.map((row) => row.requiresCode).join(" or ")]);
      continue;
    }
    for (const row of present) {
      const source = byCode.get(row.requiresCode);
      if (!source || source.id === target.id) continue;
      const problem =
        row.kind === "prereq" ? source.termId >= target.termId : row.kind === "coreq" ? source.termId > target.termId : false;
      // A course can sit in more than one group (distributed "or" rules); draw it once, and only
      // as an alternative if every group it is in offers another choice.
      const id = `${source.id}->${target.id}:${row.kind}`;
      const existing = edges.find((edge) => edge.id === id);
      if (existing) {
        existing.alternative &&= present.length > 1;
        continue;
      }
      edges.push({
        id,
        from: source.id,
        to: target.id,
        kind: row.kind,
        alternative: present.length > 1,
        problem,
      });
    }
  }

  const linked = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  for (const id of unmet.keys()) linked.add(id);
  const columns = terms.filter((term) => courses.some((course) => course.termId === term.id && linked.has(course.id)));

  // Place columns left to right, ordering each by where its requirements sit.
  const rowOf = new Map<string, number>();
  const nodes: GraphNode[] = [];
  for (const [column, term] of columns.entries()) {
    const inColumn = courses.filter((course) => course.termId === term.id && linked.has(course.id));
    const weight = (course: GraphCourse) => {
      const rows = edges.filter((edge) => edge.to === course.id && rowOf.has(edge.from)).map((edge) => rowOf.get(edge.from) ?? 0);
      return rows.length > 0 ? rows.reduce((a, b) => a + b, 0) / rows.length : Number.POSITIVE_INFINITY;
    };
    const ordered = [...inColumn].sort((a, b) => weight(a) - weight(b) || a.code.localeCompare(b.code));
    ordered.forEach((course, row) => {
      rowOf.set(course.id, row);
      nodes.push({ ...course, column, row });
    });
  }

  return { columns, nodes, edges, unmet };
}

/** A course and everything it depends on: the path through the plan to it (e.g. the chain to a focus's goal course). */
export function chainTo(code: string, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): Set<string> {
  const goal = nodes.find((node) => node.code === code);
  return goal ? new Set([goal.id, ...ancestors(goal.id, edges)]) : new Set();
}

/** Every course `id` depends on, directly or not (following arrows backwards). */
export function ancestors(id: string, edges: readonly GraphEdge[]): Set<string> {
  return walk(id, edges, (edge) => edge.to, (edge) => edge.from);
}

/** Every course that depends on `id`, directly or not (following arrows forwards). */
export function descendants(id: string, edges: readonly GraphEdge[]): Set<string> {
  return walk(id, edges, (edge) => edge.from, (edge) => edge.to);
}

function walk(start: string, edges: readonly GraphEdge[], from: (e: GraphEdge) => string, to: (e: GraphEdge) => string): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of edges) {
      if (from(edge) !== current || seen.has(to(edge))) continue;
      seen.add(to(edge));
      queue.push(to(edge));
    }
  }
  seen.delete(start);
  return seen;
}
