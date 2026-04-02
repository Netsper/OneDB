import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const frontendDistDir = path.join(rootDir, 'frontend', 'dist');
const backendSrcDir = path.join(rootDir, 'backend', 'src');
const releaseDir = path.join(rootDir, 'release');
const outputPath = path.join(releaseDir, 'OneDB.php');

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
}

function readAsset(distDir, assetRef) {
  const clean = assetRef.replace(/^\.\//, '').replace(/^\//, '');
  const fullPath = path.join(distDir, clean);
  return fs.readFileSync(fullPath, 'utf8');
}

function inlineDistHtml(distDir) {
  const indexPath = path.join(distDir, 'index.html');
  assertFileExists(indexPath);

  let html = fs.readFileSync(indexPath, 'utf8');

  html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>\s*/g, '');

  html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_full, href) => {
    const css = readAsset(distDir, href);
    return `<style>\n${css}\n</style>`;
  });

  html = html.replace(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_full, src) => {
    const js = readAsset(distDir, src);
    return `<script type="module">\n${js}\n</script>`;
  });

  return html;
}

function phpBodyWithoutTag(phpCode) {
  return phpCode
    .replace(/^<\?php\s*/i, '')
    .replace(/\?>\s*$/i, '')
    .replace(/^declare\s*\(\s*strict_types\s*=\s*1\s*\)\s*;\s*/i, '')
    .trim();
}

function listBackendSourceFiles(sourceDir) {
  const files = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.php') {
        continue;
      }

      if (entry.name === 'bootstrap.php') {
        continue;
      }

      files.push(fullPath);
    }
  };

  walk(sourceDir);
  return files;
}

function run() {
  assertFileExists(backendSrcDir);
  assertFileExists(path.join(frontendDistDir, 'index.html'));

  const backendSourceFiles = listBackendSourceFiles(backendSrcDir);
  if (backendSourceFiles.length === 0) {
    throw new Error(`No backend PHP source files found in: ${backendSrcDir}`);
  }

  const runtimeCode = backendSourceFiles
    .map((filePath) => phpBodyWithoutTag(fs.readFileSync(filePath, 'utf8')))
    .join('\n\n');

  const appHtml = inlineDistHtml(frontendDistDir);

  fs.mkdirSync(releaseDir, { recursive: true });

  const output = `<?php\ndeclare(strict_types=1);\n\n${runtimeCode}\n\nif (\\OneDB\\Runtime::dispatch()) {\n    exit;\n}\n?>\n${appHtml}\n`;
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`Built: ${outputPath}`);
}

run();
