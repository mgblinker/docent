// Every extract-*.mjs script needs to know where the sibling repos live on
// this machine - kept in one JSON file at the repo root (not hardcoded here)
// so this whole tools/ pipeline is reusable outside Michael's own checkout
// layout without editing any script.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "..", "..", "generate-docs.config.json");

let cached = null;

export function loadConfig() {
  if (cached) return cached;
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  cached = JSON.parse(raw);
  return cached;
}
