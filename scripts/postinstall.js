/* eslint-disable no-console */
const { spawnSync } = require('child_process');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  return result.status ?? 1;
}

function runPatchPackage(args = []) {
  return run('npx', ['patch-package', ...args]);
}

function main() {
  const firstApplyCode = runPatchPackage();
  if (firstApplyCode === 0) {
    return;
  }

  console.warn(
    '[postinstall] patch-package failed. Trying recovery for @maplibre/maplibre-gl-leaflet and re-applying patches...'
  );

  // Recovery step for cached CI environments where this single patch may already be partially applied.
  runPatchPackage(['--reverse', '@maplibre/maplibre-gl-leaflet']);

  const secondApplyCode = runPatchPackage();
  if (secondApplyCode !== 0) {
    process.exit(secondApplyCode);
  }
}

main();
