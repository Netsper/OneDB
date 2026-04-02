<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

if (\OneDB\Runtime::dispatch()) {
    return;
}

?><!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OneDB Backend</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #09090b; color: #e4e4e7; margin: 0; }
      .wrap { max-width: 900px; margin: 72px auto; padding: 0 20px; }
      .card { border: 1px solid #27272a; border-radius: 12px; padding: 20px; background: #18181b; }
      code { background: #27272a; padding: 2px 6px; border-radius: 6px; }
      li { margin-bottom: 8px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>OneDB backend is running</h1>
        <p>Development mode endpoints:</p>
        <ul>
          <li><code>/api/ping</code></li>
          <li><code>/api/csrf</code></li>
          <li><code>/api/test_connection</code> (POST)</li>
          <li><code>/api/query</code> (POST)</li>
        </ul>
        <p>Frontend dev server is expected at <code>http://localhost:5173</code>.</p>
      </div>
    </div>
  </body>
</html>
