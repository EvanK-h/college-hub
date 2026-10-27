// The grade calculator: pure functions over a course's assignment groups and assignments.
//
// It follows Canvas's rules for the "current" grade: only graded work counts, each group scores
// points earned over points possible, and groups are combined by weight. A group with nothing
// graded yet is left out and the remaining weights are scaled back up to 100%. A course whose
// groups have no weights is graded on total points instead.
//
// Not modelled, because the sync doesn't store them: drop-lowest rules, excused assignments and
// late penalties applied outside the score. Courses using those can differ slightly from Canvas.

export type GradeGroup = { id: number; name: string; weight: number | null };

export type GradeItem = {
  groupId: number;
  pointsPossible: number | null;
  /** null until the assignment is graded. */
  score: number | null;
};

export type GroupGrade = {
  id: number;
  name: string;
  /** The group's weight in percent, or null in a points-based course. */
  weight: number | null;
  earned: number;
  /** Points possible on graded work. */
  graded: number;
  /** Points possible on work not graded yet. */
  remaining: number;
  /** earned / graded as a percentage, or null when nothing is graded. */
  percent: number | null;
};

export type CourseGrade = {
  /** The current grade as a percentage, or null when nothing is graded yet. */
  percent: number | null;
  weighted: boolean;
  groups: GroupGrade[];
};

export type TargetOutcome =
  /** The target is reached even with zero on everything left. */
  | { kind: "secured" }
  /** Reachable: score at least `percent` on average on the remaining work. */
  | { kind: "needed"; percent: number }
  /** Out of reach: even full marks on the remaining work end at `bestPercent`. */
  | { kind: "out_of_reach"; bestPercent: number }
  /** Nothing is left to grade, so the grade is what it is. */
  | { kind: "no_remaining_work"; percent: number | null };

/** True when the course grades by group weight rather than total points. */
export function isWeighted(groups: readonly GradeGroup[]): boolean {
  return groups.some((group) => (group.weight ?? 0) > 0);
}

/** Totals per group. Items without points possible (ungraded surveys, 0-point extras) are skipped. */
export function groupGrades(groups: readonly GradeGroup[], items: readonly GradeItem[]): GroupGrade[] {
  const weighted = isWeighted(groups);
  return groups.map((group) => {
    let earned = 0;
    let graded = 0;
    let remaining = 0;
    for (const item of items) {
      if (item.groupId !== group.id || !item.pointsPossible || item.pointsPossible <= 0) continue;
      if (item.score === null) {
        remaining += item.pointsPossible;
      } else {
        earned += item.score;
        graded += item.pointsPossible;
      }
    }
    return {
      id: group.id,
      name: group.name,
      weight: weighted ? (group.weight ?? 0) : null,
      earned,
      graded,
      remaining,
      percent: graded > 0 ? (earned / graded) * 100 : null,
    };
  });
}

/**
 * The grade if the remaining work averages `fraction` (0 to 1) of its points, as a percentage.
 * With `includeRemaining` false it is the current grade: ungraded work doesn't count at all.
 * Returns null when no points count towards the grade.
 */
function gradeAt(groups: GroupGrade[], weighted: boolean, fraction: number, includeRemaining: boolean): number | null {
  if (!weighted) {
    const earned = groups.reduce((sum, g) => sum + g.earned + (includeRemaining ? g.remaining * fraction : 0), 0);
    const possible = groups.reduce((sum, g) => sum + g.graded + (includeRemaining ? g.remaining : 0), 0);
    return possible > 0 ? (earned / possible) * 100 : null;
  }

  let total = 0;
  let weightInPlay = 0;
  for (const group of groups) {
    const possible = group.graded + (includeRemaining ? group.remaining : 0);
    if (possible <= 0 || !group.weight) continue;
    const earned = group.earned + (includeRemaining ? group.remaining * fraction : 0);
    total += (group.weight * earned) / possible;
    weightInPlay += group.weight;
  }
  // Weights of groups with nothing in play are left out, and the rest scaled back up to 100%.
  return weightInPlay > 0 ? (total / weightInPlay) * 100 : null;
}

export function courseGrade(groups: readonly GradeGroup[], items: readonly GradeItem[]): CourseGrade {
  const weighted = isWeighted(groups);
  const perGroup = groupGrades(groups, items);
  return { percent: gradeAt(perGroup, weighted, 0, false), weighted, groups: perGroup };
}

/**
 * What average is needed on the work not graded yet to finish at `target` percent. The final
 * grade is a straight line in that average (it is a weighted sum), so two points on the line,
 * zero and full marks, are enough to solve for it.
 *
 * Only assignments already posted in Canvas count, so the answer can change as more are added.
 */
export function neededForTarget(groups: readonly GradeGroup[], items: readonly GradeItem[], target: number): TargetOutcome {
  const weighted = isWeighted(groups);
  const perGroup = groupGrades(groups, items);
  const hasRemaining = perGroup.some((group) => group.remaining > 0 && (!weighted || (group.weight ?? 0) > 0));
  if (!hasRemaining) return { kind: "no_remaining_work", percent: gradeAt(perGroup, weighted, 0, false) };

  const worst = gradeAt(perGroup, weighted, 0, true) ?? 0;
  const best = gradeAt(perGroup, weighted, 1, true) ?? 0;

  if (worst >= target) return { kind: "secured" };
  if (best < target) return { kind: "out_of_reach", bestPercent: best };
  return { kind: "needed", percent: ((target - worst) / (best - worst)) * 100 };
}

// Northeastern's scale: the lowest percentage for each letter.
const LETTERS: ReadonlyArray<readonly [number, string]> = [
  [93, "A"],
  [90, "A−"],
  [87, "B+"],
  [83, "B"],
  [80, "B−"],
  [77, "C+"],
  [73, "C"],
  [70, "C−"],
  [67, "D+"],
  [63, "D"],
  [60, "D−"],
];

export function letterGrade(percent: number): string {
  return LETTERS.find(([minimum]) => percent >= minimum)?.[1] ?? "F";
}

/** The letters and their minimums, for a target picker. */
export const LETTER_TARGETS = LETTERS.map(([minimum, letter]) => ({ letter, minimum }));
