import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyPreset, checkReferences, FOLDER_FILES, parseFolder, type Dataset } from "./format";

/** Reads and checks a folder; throws one error listing every problem. */
export function readFolder(folder: string): Dataset {
  if (!existsSync(folder)) throw new Error(`No folder at ${folder}`);
  const files: Record<string, unknown> = {};
  const problems: string[] = [];
  for (const [key, { file }] of Object.entries(FOLDER_FILES)) {
    const path = join(folder, file);
    if (!existsSync(path)) continue;
    try {
      files[key] = JSON.parse(readFileSync(path, "utf-8"));
    } catch (error) {
      problems.push(`${file}: not valid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  const parsed = parseFolder(files);
  if ("errors" in parsed) problems.push(...parsed.errors);
  if (problems.length > 0 || "errors" in parsed) throw new Error(`${folder} has problems:\n- ${problems.join("\n- ")}`);
  const data = applyPreset(parsed.data);
  const references = checkReferences(data);
  if (references.length > 0) throw new Error(`${folder} has problems:\n- ${references.join("\n- ")}`);
  return data;
}
