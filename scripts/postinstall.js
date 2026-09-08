/* eslint-disable no-console, @typescript-eslint/no-var-requires */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  return result.status ?? 1;
}

/**
 * Verifies that all relative .d.ts/.js imports inside @tanstack/query-core
 * legacy type declarations actually exist on disk.
 *
 * A corrupted node_modules (interrupted install, antivirus, broken cache) may
 * drop a single chunk file (e.g. hydration-*.d.ts). TypeScript then silently
 * resolves query-core types to `any`, which cascades into hundreds of bogus
 * type errors ("'enabled' does not exist...", "implicitly has an 'any' type").
 * Failing fast here makes the problem obvious right after `yarn install`.
 */
function verifyQueryCoreTypes() {
  const legacyDir = path.join(
    __dirname,
    '..',
    'node_modules',
    '@tanstack',
    'query-core',
    'build',
    'legacy',
  );

  const typesFile = path.join(legacyDir, 'types.d.ts');
  if (!fs.existsSync(typesFile)) {
    // Package layout changed — nothing to verify for this version.
    return 0;
  }

  const content = fs.readFileSync(typesFile, 'utf8');
  const importPattern = /(?:from|import)\s+['"](\.\/[^'"]+)['"]/g;
  const missing = new Set();
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    const specifier = match[1];
    // TypeScript resolves `./foo.js` inside a .d.ts to `./foo.d.ts` — the
    // runtime .js chunk itself is not required for type checking.
    const withoutJsExt = specifier.replace(/\.js$/, '');
    const candidates = [
      path.resolve(legacyDir, withoutJsExt),
      `${path.resolve(legacyDir, withoutJsExt)}.d.ts`,
      `${path.resolve(legacyDir, withoutJsExt)}.d.cts`,
    ];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      missing.add(specifier);
    }
  }

  if (missing.size > 0) {
    console.error(
      '[postinstall] Corrupted @tanstack/query-core installation detected: missing type files:',
    );
    [...missing].forEach((file) => console.error(`  - ${file}`));
    console.error(
      '[postinstall] Run a clean reinstall to fix it: remove node_modules (and yarn.lock cache entry) and run `yarn install` again.',
    );
    return 1;
  }

  return 0;
}

function runPatchPackage(args = []) {
  return run('npx', ['patch-package', ...args]);
}

function main() {
  if (verifyQueryCoreTypes() !== 0) {
    process.exit(1);
  }

  const firstApplyCode = runPatchPackage();
  if (firstApplyCode === 0) {
    return;
  }

  console.warn(
    '[postinstall] patch-package failed. Trying recovery for @maplibre/maplibre-gl-leaflet and re-applying patches...',
  );

  // Recovery step for cached CI environments where this single patch may already be partially applied.
  runPatchPackage(['--reverse', '@maplibre/maplibre-gl-leaflet']);

  const secondApplyCode = runPatchPackage();
  if (secondApplyCode !== 0) {
    process.exit(secondApplyCode);
  }
}

main();
