import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function collectTestFiles(dirPath) {
  let entries = [];
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }
    if (
      entry.isFile() &&
      (entry.name.endsWith('.test.js') ||
        entry.name.endsWith('.test.mjs') ||
        entry.name.endsWith('.test.cjs'))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

const targetDir = process.argv[2];

if (!targetDir) {
  console.error('Missing test directory argument.');
  process.exit(1);
}

const rootDir = resolve(process.cwd(), targetDir);
let dirExists = false;
try {
  dirExists = statSync(rootDir).isDirectory();
} catch {
  dirExists = false;
}

if (!dirExists) {
  if (process.env.ALLOW_EMPTY_TESTS === '1') {
    console.log(`No test directory found at '${targetDir}', skipping (ALLOW_EMPTY_TESTS=1).`);
    process.exit(0);
  }
  console.error(`No test directory found at '${targetDir}'.`);
  process.exit(1);
}

const testFiles = collectTestFiles(rootDir).sort();

if (testFiles.length === 0) {
  if (process.env.ALLOW_EMPTY_TESTS === '1') {
    console.log(`No node test files found under '${targetDir}', skipping (ALLOW_EMPTY_TESTS=1).`);
    process.exit(0);
  }
  console.error(`No node test files found under '${targetDir}'.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
