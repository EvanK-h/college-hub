// How much each swap option helps the AI direction, on the same scale as quantum relevance
// (none < lower < low < medium < high). Drafted 27 Oct 2026 from the catalogue descriptions; see
// the 2026-10-27 decision. Keyed by the swap's name exactly as the Notion import wrote it, so a
// course offered for two slots gets one rating. Imported by scripts/import-ai-relevance.ts.
import type { Relevance } from "@/lib/pathway/labels";

export const AI_RELEVANCE: Record<string, Relevance> = {
  // Machine learning and AI systems directly.
  "DS 4420 · Advanced Machine Learning": "high",
  "CS 4130 · Engineering LLM-Integrated Systems": "high",
  "CS 4180 · Reinforcement Learning": "high",
  // Applied AI, or the algorithms and data work under it.
  "CS 4220 · Information Retrieval": "medium",
  "CS 4610 · Robotics": "medium",
  "CY 4100 · AI Security and Privacy": "medium",
  "CS 4810 · Advanced Algorithms": "medium",
  "DS 3500 · Advanced Programming with Data": "medium",
  "PHYS 5116 · Network Science 1": "medium", // graphs and networks, the basis of graph ML
  // Useful background, or AI at a distance.
  "CS 4160 · AI Policy: Machine Learning, Markets, and Morals": "low",
  "CS 4150 · Game Artificial Intelligence": "low",
  "CS 4400 · Programming Languages": "low",
  "CS 2800 · Logic and Computation": "low",
  "CS 4535 · Professional Practicum Capstone": "low",
  "PHIL 1115 · Introduction to Logic": "low",
  "INSH 1600 or PHIL 1115 (in place of MATH 2341)": "low",
  "PHYS 4305 · Thermodynamics and Statistical Mechanics": "low", // the maths behind energy-based and diffusion models
  "MATH 4606 · Mathematical and Computational Methods for Physics": "low",
  "PHYS 3211 · Advanced Computational Problem Solving in Physics": "low",
  "CY 4770 · Foundations of Cryptography": "lower",
  "CS 4700 · Network Fundamentals": "lower",
  // Nothing for AI.
  "INSH 1600 · Cultures of London": "none",
  "PHYS 5125 · Advanced Quantum Mechanics": "none",
  "PHYS 3602 · Electricity and Magnetism 1": "none",
  "PHYS 3601 · Classical Dynamics": "none",
  "PHYS 2371 + 2372 · Electronics with lab": "none",
  "ENGW 3315 · Interdisciplinary Advanced Writing": "none",
};
