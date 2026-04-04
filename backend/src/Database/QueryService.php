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
        $columns = [];

        while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) !== false) {
            if ($rowCount >= $maxRows) {
                $truncated = true;
                break;
            }

            if ($rowCount === 0 && is_array($row)) {
                $columns = array_map('strval', array_keys($row));
            }

            $rows[] = $row;
            $rowCount++;
        }

        if ($columns === []) {
            for ($index = 0; $index < $stmt->columnCount(); $index++) {
                $meta = $stmt->getColumnMeta($index);
                if (is_array($meta)) {
                    $columns[] = (string)($meta['name'] ?? '');
                }
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

    /**
     * Executes SQL statements within a single transaction.
     *
     * @param array<string,mixed> $connection
     * @param array<int,string> $statements
     * @return array<string,mixed>
     */
    public static function executeTransactionBatch(array $connection, array $statements): array
    {
        $pdo = ConnectionFactory::makePdo($connection);
        $startedAt = microtime(true);
        $executedStatements = 0;
        $affectedRows = 0;

        $pdo->beginTransaction();
        try {
            foreach ($statements as $statement) {
                $stmt = $pdo->prepare($statement);
                $stmt->execute();
                $executedStatements++;
                if ($stmt->columnCount() === 0) {
                    $affectedRows += max(0, (int)$stmt->rowCount());
                }
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $durationMs = (microtime(true) - $startedAt) * 1000;

        return [
            'ok' => true,
            'kind' => 'transaction',
            'executedStatements' => $executedStatements,
            'affectedRows' => $affectedRows,
            'durationMs' => round($durationMs, 2),
        ];
    }
}
