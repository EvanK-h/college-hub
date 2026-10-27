// Prerequisites and corequisites for the planned courses, from the Northeastern course catalogue
// (catalog.northeastern.edu/course-descriptions/<subject>/, read 27 Oct 2026). Public data, so it
// lives in the repo. Imported by scripts/import-prereqs.ts; see the 2026-10-27 decision.
//
// Each list is an AND of OR-groups: every inner array must be met by one of its codes.
// - prereq: finished in an earlier term.
// - coreq: taken in the same term or earlier ("may be taken concurrently" counts as a coreq).
//
// Left out on purpose, everywhere:
// - Transfer-equivalent codes (CIS 200M, CIS 201M, CIS 250M, CIS 310M, MATH 209M, MATH 316M,
//   WRIT 201M). They aren't real course codes and can't be in the plan.
// - Minimum grades ("with a minimum grade of D-/C"). The plan doesn't hold grades.
//
// Nested catalogue rules are rewritten into AND-of-OR form by distribution, which keeps their
// meaning: "(A and B) or C" becomes [A, C] and [B, C].

export type PrereqEntry = {
  course: string;
  prereq?: string[][];
  coreq?: string[][];
  /** Anything that needs a human eye: judgement calls, odd catalogue text, rules not modelled. */
  review?: string;
};

export const PREREQS: PrereqEntry[] = [
  { course: "CS 1800", coreq: [["CS 1802"]] },
  { course: "CS 1802", coreq: [["CS 1800"]] },
  {
    course: "CS 2100",
    prereq: [["CS 2000", "CS 2500"]],
    coreq: [["CS 2101"]],
    review: "You placed out of CS 2000, so this shows as unmet in the plan. CS 2100 is already in progress.",
  },
  { course: "CS 2101", coreq: [["CS 2100"]] },
  {
    course: "CS 2700",
    prereq: [["CS 1800", "MATH 1365", "MATH 1465"], ["CS 2100"]],
    coreq: [["CS 2701"]],
  },
  { course: "CS 2701", coreq: [["CS 2700"]] },
  {
    course: "CS 3000",
    // Catalogue: ((CS 2100 or CS 2510 or DS 2500) and (CS 1800 or EECE 2160)) or CS 2700.
    prereq: [
      ["CS 2100", "CS 2510", "DS 2500", "CS 2700"],
      ["CS 1800", "EECE 2160", "CS 2700"],
    ],
    review: "The catalogue's CS 3001 corequisite is left out: your plan counts the recitation as part of CS 3000.",
  },
  { course: "CS 3100", prereq: [["CS 2100", "CS 2510", "EECE 2560"]], coreq: [["CS 3101"]] },
  { course: "CS 3101", coreq: [["CS 3100"]] },
  { course: "CS 3200", prereq: [["CS 2000", "CS 2100", "CS 2500", "DS 2000", "DS 2500", "EECE 2560"]] },
  { course: "CS 3520", prereq: [["CS 2100", "CS 2510", "DS 2500"]] },
  { course: "CS 3650", prereq: [["CS 2510", "CS 3100", "EECE 2560"]] },
  { course: "CS 3800", prereq: [["CS 2100", "CS 2510", "EECE 2160"]] },
  {
    course: "CS 4100",
    // Catalogue: DS 3000 or (MATH 2331 and MATH 3081).
    prereq: [
      ["DS 3000", "MATH 2331"],
      ["DS 3000", "MATH 3081"],
    ],
  },
  { course: "CS 4120", prereq: [["DS 4400"]] },
  { course: "CS 4530", prereq: [["CS 3100", "CS 3500"]] },
  { course: "CS 4805", prereq: [["CS 3800"]] },
  { course: "DS 3000", prereq: [["CS 2100", "CS 2510", "DS 2500"]] },
  {
    course: "DS 4400",
    // Catalogue: DS 3000 or (MATH 2331 and MATH 3081).
    prereq: [
      ["DS 3000", "MATH 2331"],
      ["DS 3000", "MATH 3081"],
    ],
  },
  { course: "DS 4440", prereq: [["DS 4400"]] },
  {
    course: "PHYS 2303",
    prereq: [["PHYS 1155", "PHYS 1165", "PHYS 1175"]],
    coreq: [["MATH 2321"]],
  },
  { course: "PHYS 4115", prereq: [["PHYS 2303"]] },
  {
    course: "ENGW 3302",
    prereq: [["ENGW 1102", "ENGW 1111", "ENGL 1102", "ENGL 1111", "ENGW 1113", "ENGW 1114"]],
    review: "Needs a C or better in first-year writing; grades aren't checked.",
  },
  {
    course: "CY 2550",
    prereq: [["CS 2100", "CS 2500", "DS 2000", "DS 2500"]],
    review: "The catalogue text is split across two lines with no 'or' or 'and' between them; read as one 'or' list.",
  },
  {
    course: "ECON 2350",
    coreq: [["CS 1100", "CS 2000", "CS 2100", "CS 2500", "DS 2000", "DS 2500", "MISM 2510"]],
    review: "Unexpected for an economics course: the catalogue lists an intro programming course, which may be taken concurrently. Worth confirming.",
  },
  {
    course: "PHYS 5352",
    review: "No prerequisite in the catalogue, though your plan treats PHYS 4115 as its lead-in. Not enforced.",
  },
  { course: "MATH 2321", review: "None required; the catalogue strongly recommends Calculus 2 (MATH 1342, done)." },
  { course: "MATH 2341", review: "None required; the catalogue strongly recommends Calculus 2 (MATH 1342, done)." },
  // No prerequisites in the catalogue: CS 1200, CS 1210, DS 3050, ENGW 1111, COMM 1112.
  // Not looked up: ABRC 5005 (a London programme course) and the co-ops.
];
