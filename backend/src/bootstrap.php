<?php

declare(strict_types=1);

/**
 * Loads backend runtime source files for development mode.
 *
 * Release packaging inlines source code directly and does not use this loader.
 */
$sourceDir = __DIR__;
$phpFiles = [];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($sourceDir, FilesystemIterator::SKIP_DOTS)
);

foreach ($iterator as $fileInfo) {
    if (!$fileInfo->isFile()) {
        continue;
    }

    if (strtolower($fileInfo->getExtension()) !== 'php') {
        continue;
    }

    $path = $fileInfo->getPathname();
    if ($path === __FILE__) {
        continue;
    }

    $phpFiles[] = $path;
}

sort($phpFiles, SORT_STRING);

foreach ($phpFiles as $file) {
    require_once $file;
}
