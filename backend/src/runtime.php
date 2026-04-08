<?php

declare(strict_types=1);

namespace OneDB;

use OneDB\Database\ConnectionFactory;
use OneDB\Database\MetadataService;
use OneDB\Database\QueryService;
use OneDB\Database\ReadOnlySqlGuard;
use OneDB\Http\ApiRequest;
use OneDB\Http\CorsPolicy;
use OneDB\Http\HttpException;
use OneDB\Http\JsonResponse;
use OneDB\Http\SessionCsrf;
use OneDB\Support\Environment;
use OneDB\Support\ErrorResponder;
use OneDB\Support\UploadLimits;
use OneDB\Support\DebugTelemetry;
use PDOException;
use Throwable;

/**
 * Runtime API dispatcher for OneDB.
 *
 * This class stays intentionally small and delegates data operations to
 * specialized service classes under `backend/src/Database` and `backend/src/Http`.
 */
final class Runtime
{
    /**
     * Handles API dispatch for backend requests.
     *
     * @return bool True when request is handled by runtime API, false otherwise.
     */
    public static function dispatch(): bool
    {
        if (!ApiRequest::isApiRequest()) {
            return false;
        }

        DebugTelemetry::beginRequest();
        $statusCode = 200;
        $action = '';
        try {
            SessionCsrf::bootSession();
            CorsPolicy::sendDevelopmentHeaders();

            if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
                $statusCode = 204;
                http_response_code($statusCode);
                return true;
            }

            $action = ApiRequest::resolveAction();
            DebugTelemetry::setAction($action);
            if ($action === '') {
                $statusCode = 400;
                JsonResponse::send(
                    ErrorResponder::fromMessage('Missing action parameter.', $statusCode, 'missing_action'),
                    $statusCode
                );
                return true;
            }

            try {
                self::dispatchAction($action);
                $status = http_response_code();
                $statusCode = is_int($status) && $status > 0 ? $status : 200;
            } catch (HttpException $e) {
                $statusCode = $e->statusCode();
                JsonResponse::send(ErrorResponder::fromThrowable($e, $statusCode, $action), $statusCode);
            } catch (PDOException $e) {
                $statusCode = 500;
                JsonResponse::send(ErrorResponder::fromThrowable($e, $statusCode, $action), $statusCode);
            } catch (Throwable $e) {
                $statusCode = 500;
                JsonResponse::send(ErrorResponder::fromThrowable($e, $statusCode, $action), $statusCode);
            }

            return true;
        } finally {
            $status = http_response_code();
            if (is_int($status) && $status > 0) {
                $statusCode = $status;
            }
            DebugTelemetry::logRequest($statusCode);
        }
    }

    /**
     * Routes one action to the matching service layer operation.
     */
    private static function dispatchAction(string $action): void
    {
        switch ($action) {
            case 'csrf':
                self::requireMethod(['GET']);
                JsonResponse::send(['ok' => true, 'token' => SessionCsrf::token()]);
                return;

            case 'ping':
                self::requireMethod(['GET']);
                JsonResponse::send([
                    'ok' => true,
                    'time' => gmdate('c'),
                    'php' => PHP_VERSION,
                    'readonly' => Environment::readonlyMode(),
                ]);
                return;

            case 'upload_limits':
                self::requireMethod(['GET']);
                JsonResponse::send([
                    'ok' => true,
                    'limits' => UploadLimits::collect(),
                ]);
                return;

            case 'test_connection':
                self::requireMethod(['POST']);
                SessionCsrf::requireValidToken();
                $payload = ApiRequest::readJson();
                $pdo = ConnectionFactory::makePdo(self::connectionPayload($payload));
                $pdo->query('SELECT 1');
                JsonResponse::send(['ok' => true, 'message' => 'Connection successful.']);
                return;

            case 'list_databases':
                self::requireMethod(['POST']);
                SessionCsrf::requireValidToken();
                $payload = ApiRequest::readJson();
                JsonResponse::send([
                    'ok' => true,
                    'databases' => MetadataService::listDatabases(self::connectionPayload($payload)),
                ]);
                return;

            case 'list_tables':
                self::requireMethod(['POST']);
                SessionCsrf::requireValidToken();
                $payload = ApiRequest::readJson();
                JsonResponse::send([
                    'ok' => true,
                    'tables' => MetadataService::listTables(self::connectionPayload($payload)),
                ]);
                return;

            case 'browse_table':
                self::requireMethod(['POST']);
                SessionCsrf::requireValidToken();
                JsonResponse::send(MetadataService::browseTable(ApiRequest::readJson()));
                return;

            case 'query':
                self::requireMethod(['POST']);
                SessionCsrf::requireValidToken();
                self::handleQueryAction(ApiRequest::readJson());
                return;

            case 'query_transaction':
                self::requireMethod(['POST']);
                SessionCsrf::requireValidToken();
                self::handleTransactionAction(ApiRequest::readJson());
                return;

            case 'build_release':
                self::handleBuildRelease();
                return;

            default:
                JsonResponse::send(
                    ErrorResponder::fromMessage('Unsupported action.', 404, 'unsupported_action', $action),
                    404
                );
                return;
        }
    }

    /**
     * Executes SQL query action including readonly and payload validation.
     *
     * @param array<string,mixed> $payload
     */
    private static function handleQueryAction(array $payload): void
    {
        $sql = trim((string)($payload['sql'] ?? ''));
        if ($sql === '') {
            JsonResponse::send(
                ErrorResponder::fromMessage('SQL is required.', 400, 'missing_sql', 'query'),
                400
            );
            return;
        }

        if (!ReadOnlySqlGuard::hasSingleStatement($sql)) {
            JsonResponse::send(
                ErrorResponder::fromMessage(
                    'Only a single SQL statement is allowed per request.',
                    400,
                    'multiple_statements_not_allowed',
                    'query'
                ),
                400
            );
            return;
        }

        if (Environment::readonlyMode() && !ReadOnlySqlGuard::isReadOnly($sql)) {
            JsonResponse::send(
                ErrorResponder::fromMessage(
                    'Readonly mode allows only read queries.',
                    403,
                    'readonly_violation',
                    'query'
                ),
                403
            );
            return;
        }

        $result = QueryService::execute(self::connectionPayload($payload), $sql);
        JsonResponse::send($result);
    }

    /**
     * Executes a staged mutation list in a single DB transaction.
     *
     * @param array<string,mixed> $payload
     */
    private static function handleTransactionAction(array $payload): void
    {
        $rawStatements = is_array($payload['statements'] ?? null) ? $payload['statements'] : [];
        $statements = [];

        foreach ($rawStatements as $statement) {
            if (!is_string($statement)) {
                continue;
            }
            $sql = trim($statement);
            if ($sql === '') {
                continue;
            }
            if (!ReadOnlySqlGuard::hasSingleStatement($sql)) {
                JsonResponse::send(
                    ErrorResponder::fromMessage(
                        'Only a single SQL statement is allowed in each transaction step.',
                        400,
                        'multiple_statements_not_allowed',
                        'query_transaction'
                    ),
                    400
                );
                return;
            }
            $statements[] = $sql;
        }

        if ($statements === []) {
            JsonResponse::send(
                ErrorResponder::fromMessage(
                    'At least one SQL statement is required.',
                    400,
                    'missing_transaction_statements',
                    'query_transaction'
                ),
                400
            );
            return;
        }

        if (Environment::readonlyMode()) {
            foreach ($statements as $statement) {
                if (!ReadOnlySqlGuard::isReadOnly($statement)) {
                    JsonResponse::send(
                        ErrorResponder::fromMessage(
                            'Readonly mode allows only read queries.',
                            403,
                            'readonly_violation',
                            'query_transaction'
                        ),
                        403
                    );
                    return;
                }
            }
        }

        $result = QueryService::executeTransactionBatch(self::connectionPayload($payload), $statements);
        JsonResponse::send($result);
    }

    /**
     * Extracts connection payload in a type-safe way.
     *
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private static function connectionPayload(array $payload): array
    {
        return is_array($payload['connection'] ?? null) ? $payload['connection'] : [];
    }

    /**
     * Enforces allowed HTTP methods for one API action.
     *
     * @param array<int,string> $allowed
     */
    private static function requireMethod(array $allowed): void
    {
        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $normalizedAllowed = array_map('strtoupper', $allowed);

        if (!in_array($method, $normalizedAllowed, true)) {
            throw new HttpException('HTTP method not allowed for this action.', 405);
        }
    }

    /**
     * Executes the build script and serves the resulting OneDB.php file.
     */
    private static function handleBuildRelease(): void
    {
        self::requireMethod(['POST']);
        SessionCsrf::requireValidToken();

        if (Environment::readonlyMode()) {
            throw new HttpException('Build is not allowed in readonly mode.', 403);
        }

        $rootDir = dirname(__DIR__, 2);
        $buildScript = $rootDir . '/build.sh';
        $releaseFile = $rootDir . '/release/OneDB.php';

        if (!file_exists($buildScript)) {
            throw new HttpException('Build script not found.', 500);
        }

        $output = [];
        $resultCode = 0;
        
        // Increase execution time and memory for the build process
        @ini_set('max_execution_time', '300');
        @ini_set('memory_limit', '512M');
        
        // Run with ONEDB_EMBEDDED=1 to ensure standalone build
        // Use sh -c to ensure environment variables are handled correctly across shells
        $command = "export ONEDB_EMBEDDED=1 && sh " . escapeshellarg($buildScript) . " 2>&1";
        exec($command, $output, $resultCode);

        if ($resultCode !== 0) {
            JsonResponse::send([
                'ok' => false,
                'error' => 'Build failed.',
                'details' => implode("\n", $output)
            ], 500);
            return;
        }

        if (!file_exists($releaseFile)) {
            throw new HttpException('Build succeeded but release file was not found.', 500);
        }

        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="OneDB.php"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($releaseFile));
        readfile($releaseFile);
        exit;
    }
}
