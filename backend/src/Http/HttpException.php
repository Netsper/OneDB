<?php

declare(strict_types=1);

namespace OneDB\Http;

use RuntimeException;

/**
 * Represents a client-visible API error with an explicit HTTP status code.
 */
final class HttpException extends RuntimeException
{
    /**
     * @var int
     */
    private $statusCode;

    public function __construct(string $message, int $statusCode = 400)
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }
}
