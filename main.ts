import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  entries.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      writeFileSync(to, readFileSync(from));
    }
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  copyDir(join(here, 'game'), join(outDir, 'game'));
  copyDir(join(here, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = await buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

main();
