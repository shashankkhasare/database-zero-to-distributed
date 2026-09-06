import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const output = resolve(process.argv[2] ?? "build/book");
const requiredPages = [
  "index.html",
  "contents.html",
  "001-smallest-query-engine.html",
  "appendix-a-enough-rust.html",
  "404.html",
  ".nojekyll",
];

for (const page of requiredPages) await access(join(output, page));

const htmlFiles = (await walk(output)).filter((file) => file.endsWith(".html"));
const missing = [];
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1].split(/[?#]/, 1)[0];
    if (!reference || reference.startsWith("/") || /^(?:[a-z]+:|\/\/)/i.test(reference)) continue;
    const target = resolve(dirname(file), decodeURIComponent(reference));
    try {
      await access(target);
    } catch {
      missing.push(`${file.slice(output.length + 1)} -> ${reference}`);
    }
  }
}

if (missing.length > 0) {
  throw new Error(`Broken generated references:\n${missing.join("\n")}`);
}

console.log(`Verified ${htmlFiles.length} HTML pages in ${output}`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}
