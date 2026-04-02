<?php

declare(strict_types=1);

namespace OneDB\Database;

use OneDB\Support\Environment;
use PDO;

/**
 * Executes user SQL statements and shapes API payload responses.
 */
final class QueryService
{
    /**
     * Executes SQL and returns a normalized API response payload.
     *
     * @param array<string,mixed> $connection
     * @return array<string,mixed>
     */
    public static function execute(array $connection, string $sql): array
    {
        $pdo = ConnectionFactory::makePdo($connection);
        $stmt = $pdo->prepare($sql);

        $startedAt = microtime(true);
        $stmt->execute();
        $durationMs = (microtime(true) - $startedAt) * 1000;

        if ($stmt->columnCount() === 0) {
            return [
                'ok' => true,
                'kind' => 'mutation',
                'affectedRows' => $stmt->rowCount(),
                'durationMs' => round($durationMs, 2),
            ];
        }

        $maxRows = Environment::maxResultRows();
        $rows = [];
        $truncated = false;
        $rowCount = 0;

        while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) !== false) {
            if ($rowCount >= $maxRows) {
                $truncated = true;
                break;
            }

            $rows[] = $row;
            $rowCount++;
        }

        $columns = [];
        for ($index = 0; $index < $stmt->columnCount(); $index++) {
            $meta = $stmt->getColumnMeta($index);
            if (is_array($meta)) {
                $columns[] = (string)($meta['name'] ?? '');
            }
        }

        return [
            'ok' => true,
            'kind' => 'result_set',
            'columns' => $columns,
            'rows' => $rows,
            'rowCount' => $rowCount,
            'durationMs' => round($durationMs, 2),
            'truncated' => $truncated,
            'maxRows' => $maxRows,
        ];
    }
}
