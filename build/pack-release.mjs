import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const frontendDistDir = path.join(rootDir, 'frontend', 'dist');
const runtimePath = path.join(rootDir, 'backend', 'src', 'runtime.php');
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
    .trim();
}

function run() {
  assertFileExists(runtimePath);
  assertFileExists(path.join(frontendDistDir, 'index.html'));

  const runtimeCode = phpBodyWithoutTag(fs.readFileSync(runtimePath, 'utf8'));
  const appHtml = inlineDistHtml(frontendDistDir);

  fs.mkdirSync(releaseDir, { recursive: true });

  const output = `<?php\n${runtimeCode}\n\nif (\\OneDB\\Runtime::dispatch()) {\n    exit;\n}\n?>\n${appHtml}\n`;
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`Built: ${outputPath}`);
}

run();
