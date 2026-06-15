/* eslint-disable @stylistic/max-len */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', 'examples');
const outDir = join(here, '..', 'docs', 'examples');
const apiDir = join(here, '..', 'docs', 'api');

const apiIndex = `# API Reference

Module-by-module reference, auto-generated from the JSDoc in \`@camera.ui/sdk\`.

| Module | What's in it |
| --- | --- |
| [Plugin API](./plugin/) | \`BasePlugin\`, the manifest contract, optional interfaces (discovery, notifier, detection). |
| [Camera](./camera/) | Camera config, frames, streaming sessions, detection events, runtime device API. |
| [Sensors](./sensor/) | Detection sensors (motion, object, face, license-plate, audio, classifier, clip) and smart-home sensors (contact, doorbell, lock, garage, light, switch, ptz, security system, environmental). |
| [Storage & Schema](./storage/) | Schema-driven per-device config rendered as UI forms by the host. |
| [Manager](./manager/) | \`CoreManager\` / \`DeviceManager\` / \`DownloadManager\` for system-level services. |
| [Observable](./observable/) | Reactive primitives — \`Observable\`, \`Subject\`, \`BehaviorSubject\`, \`ReplaySubject\` — and operators. |
| [Types](./types/) | Shared types (\`LoggerService\`, \`PluginAPI\`, …). |

If you're new to the SDK, start with the [Plugin Guide](/examples/getting-started) instead — it walks through these modules in the order you'll actually use them.
`;

writeFileSync(join(apiDir, 'index.md'), apiIndex);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const indexSrc = readFileSync(join(examplesDir, 'README.md'), 'utf8');
const indexOut = indexSrc.replace(/\[`([^`]+)\/`\]\(\.\/\1\/\)/g, '[`$1`](/examples/$1)').replace(/^# .+/m, '# Examples');
writeFileSync(join(outDir, 'index.md'), indexOut);

const entries = readdirSync(examplesDir).sort();

for (const name of entries) {
  const full = join(examplesDir, name);
  const stat = statSync(full);

  if (stat.isFile() && name.endsWith('.md') && name !== 'README.md') {
    const src = readFileSync(full, 'utf8');
    writeFileSync(join(outDir, name), src);
    continue;
  }

  if (!stat.isDirectory()) continue;

  const readme = readFileSync(join(full, 'README.md'), 'utf8');
  const contract = readFileSync(join(full, 'contract.ts'), 'utf8');
  const index = readFileSync(join(full, 'index.ts'), 'utf8');

  const page = [readme.trimEnd(), '', '## `contract.ts`', '', '```ts', contract.trimEnd(), '```', '', '## `index.ts`', '', '```ts', index.trimEnd(), '```', ''].join(
    '\n',
  );

  writeFileSync(join(outDir, `${name}.md`), page);
}

console.log(`Built example pages to ${outDir}`);
