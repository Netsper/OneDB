<?php

declare(strict_types=1);

namespace OneDB\Support;

/**
 * Reads upload and execution limits from php.ini.
 */
final class UploadLimits
{
    /**
     * Parses and returns upload/memory related PHP runtime limits.
     *
     * @return array<string,mixed>
     */
    public static function collect(): array
    {
        $uploadRaw = trim((string)(ini_get('upload_max_filesize') ?: ''));
        $postRaw = trim((string)(ini_get('post_max_size') ?: ''));
        $memoryRaw = trim((string)(ini_get('memory_limit') ?: ''));

        $uploadBytes = self::iniSizeToBytes($uploadRaw);
        $postBytes = self::iniSizeToBytes($postRaw);
        $memoryBytes = self::iniSizeToBytes($memoryRaw);

        return [
            'uploadMaxFilesize' => [
                'raw' => $uploadRaw,
                'bytes' => $uploadBytes,
            ],
            'postMaxSize' => [
                'raw' => $postRaw,
                'bytes' => $postBytes,
            ],
            'memoryLimit' => [
                'raw' => $memoryRaw,
                'bytes' => $memoryBytes,
            ],
            'maxFileUploads' => self::iniInt('max_file_uploads'),
            'maxExecutionTime' => self::iniInt('max_execution_time'),
            'effectiveUploadLimit' => [
                'bytes' => self::smallestLimit([$uploadBytes, $postBytes]),
            ],
        ];
    }

    /**
     * Reads integer value from php.ini.
     */
    private static function iniInt(string $key): ?int
    {
        $raw = ini_get($key);
        if ($raw === false) {
            return null;
        }

        $value = trim((string)$raw);
        if ($value === '' || !is_numeric($value)) {
            return null;
        }

        return (int)$value;
    }

    /**
     * Parses php.ini style size value (`2M`, `512K`, `-1`) to bytes.
     */
    private static function iniSizeToBytes(string $raw): ?int
    {
        $value = strtolower(trim($raw));
        if ($value === '') {
            return null;
        }

        if ($value === '-1') {
            return -1;
        }

        if (!preg_match('/^([0-9]+(?:\.[0-9]+)?)\s*([kmgtpe]?b?)?$/', $value, $matches)) {
            return null;
        }

        $amount = (float)($matches[1] ?? 0);
        $unit = rtrim((string)($matches[2] ?? ''), 'b');
        $powerMap = [
            '' => 0,
            'k' => 1,
            'm' => 2,
            'g' => 3,
            't' => 4,
            'p' => 5,
            'e' => 6,
        ];

        if (!array_key_exists($unit, $powerMap)) {
            return null;
        }

        $bytes = $amount * (1024 ** $powerMap[$unit]);
        if (!is_finite($bytes)) {
            return PHP_INT_MAX;
        }

        return (int)round(min($bytes, (float)PHP_INT_MAX));
    }

    /**
     * Returns smallest finite limit in bytes, preserving unlimited (`-1`) semantics.
     *
     * @param array<int|null> $limits
     */
    private static function smallestLimit(array $limits): ?int
    {
        $finiteLimits = [];
        $hasUnlimited = false;

        foreach ($limits as $limit) {
            if (!is_int($limit)) {
                continue;
            }
            if ($limit < 0) {
                $hasUnlimited = true;
                continue;
            }
            $finiteLimits[] = $limit;
        }

        if ($finiteLimits !== []) {
            return min($finiteLimits);
        }

        return $hasUnlimited ? -1 : null;
    }
}
