// The Northeastern preset: what `"preset": "northeastern"` in profile.json fills in, so a
// Northeastern student only writes their own courses. Anything the profile sets itself wins.
import type { PrereqEntry } from "./format";

// Prerequisites and corequisites from the Northeastern course catalogue
// (catalog.northeastern.edu/course-descriptions/<subject>/, read 27 Oct 2026). Public data. Only
// courses in your plan get rows; see the 2026-10-27 decision.
//
// Each list is an AND of OR-groups: every inner array must be met by one of its codes.
// - prereq: finished in an earlier term.
// - coreq: taken in the same term or earlier ("may be taken concurrently" counts as a coreq).
// - recommended: advice, not a requirement. Drawn in the prerequisite graph, ignored by move checks.
//
// Left out on purpose, everywhere:
// - Transfer-equivalent codes (CIS 200M, MATH 209M and the like). They aren't real course codes
//   and can't be in a plan.
// - Minimum grades ("with a minimum grade of D-/C"). The plan doesn't hold grades.
//
// Nested catalogue rules are rewritten into AND-of-OR form by distribution, which keeps their
// meaning: "(A and B) or C" becomes [A, C] and [B, C].
const CATALOGUE_PREREQS: PrereqEntry[] = [
  { course: "CS 1800", coreq: [["CS 1802"]] },
  { course: "CS 1802", coreq: [["CS 1800"]] },
  { course: "CS 2100", prereq: [["CS 2000", "CS 2500"]], coreq: [["CS 2101"]] },
  { course: "CS 2101", coreq: [["CS 2100"]] },
  { course: "CS 2700", prereq: [["CS 1800", "MATH 1365", "MATH 1465"], ["CS 2100"]], coreq: [["CS 2701"]] },
  { course: "CS 2701", coreq: [["CS 2700"]] },
  {
    course: "CS 3000",
    // Catalogue: ((CS 2100 or CS 2510 or DS 2500) and (CS 1800 or EECE 2160)) or CS 2700.
    prereq: [
      ["CS 2100", "CS 2510", "DS 2500", "CS 2700"],
      ["CS 1800", "EECE 2160", "CS 2700"],
    ],
    coreq: [["CS 3001"]],
  },
  { course: "CS 3001", coreq: [["CS 3000"]] },
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
  { course: "PHYS 2303", prereq: [["PHYS 1155", "PHYS 1165", "PHYS 1175"]], coreq: [["MATH 2321"]] },
  { course: "PHYS 4115", prereq: [["PHYS 2303"]] },
  {
    course: "ENGW 3302",
    prereq: [["ENGW 1102", "ENGW 1111", "ENGL 1102", "ENGL 1111", "ENGW 1113", "ENGW 1114"]],
    review: "Needs a C or better in first-year writing; grades aren't checked.",
  },
  {
    course: "CY 2550",
    prereq: [["CS 2100", "CS 2500", "DS 2000", "DS 2500"]],
    // The catalogue text is split across two lines with no connective. Read as one "or" list:
    // "and" would demand two intro courses, which no other course in the catalogue does.
    review: "The catalogue text is split across two lines with no 'or' or 'and' between them; read as one 'or' list.",
  },
  {
    // "Statistics for Economists": an intro programming course, which may be taken concurrently.
    course: "ECON 2350",
    coreq: [["CS 1100", "CS 2000", "CS 2100", "CS 2500", "DS 2000", "DS 2500", "MISM 2510"]],
  },
  // The catalogue: "Prior completion of Calculus 2 is strongly recommended."
  { course: "MATH 2321", recommended: [["MATH 1342"]] },
  { course: "MATH 2341", recommended: [["MATH 1342"]] },
  // No prerequisites in the catalogue: CS 1200, CS 1210, DS 3050, ENGW 1111, COMM 1112, PHYS 5352.
];

export const NORTHEASTERN = {
  school: "Northeastern University",
  creditUnit: "SH",
  timeZone: "America/New_York",
  attributeSetName: "NUpath",
  // The registrar's scale: the lowest percentage for each letter.
  gradeScale: [
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
  ] as [number, string][],
  // Most SH a term may hold without an overload petition.
  creditLimits: { semester: 18, summer: 9 },
  attributes: [
    { code: "ND", name: "Engaging with the Natural and Designed World", required: true },
    { code: "EI", name: "Exploring Creative Expression and Innovation", required: true },
    { code: "IC", name: "Interpreting Culture", required: true },
    { code: "FQ", name: "Conducting Formal and Quantitative Reasoning", required: true },
    { code: "SI", name: "Understanding Societies and Institutions", required: true },
    { code: "AD", name: "Analyzing and Using Data", required: true },
    { code: "DD", name: "Engaging Differences and Diversity", required: true },
    { code: "ER", name: "Employing Ethical Reasoning", required: true },
    { code: "WF", name: "Writing in the First Year", required: true },
    { code: "WD", name: "Advanced Writing in the Disciplines", required: true },
    { code: "WI", name: "Writing-Intensive", required: true },
    { code: "EX", name: "Integrating Knowledge and Skills Through Experience", required: true },
    { code: "CE", name: "Demonstrating Thought and Action in a Capstone", required: true },
  ],
  prereqs: CATALOGUE_PREREQS,
};
