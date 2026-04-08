# OneDB Project Identity

This document provides the foundational context for AI agents and IDEs to understand the OneDB project structure and goals.

## 📌 Project Overview
**OneDB** is a lightweight, single-file database management tool. It consists of a React-based SPA that communicates with a PHP-based backend.

- **Primary Goal**: Provide a premium, modular database management experience that can be deployed as a single PHP file.
- **Key Feature**: Zero-configuration, high-performance database introspection and manipulation.

## 🛠️ Technology Stack
- **Frontend**: React 18, Vite, Lucide Icons, CodeMirror (SQL Editor).
- **Backend**: PHP 8.1+ (Standard PDO).
- **Build System**: Custom NodeJS scripts (`pack-release.mjs`) for inlining assets into a single PHP file.

## 📈 Versioning & Status
- **Current Version**: `1.0.0`
- **Last Update**: 2026-04-08
- **Stability**: Beta/Production-ready.

## ⚠️ Development Constraints
- **Single-File Integrity**: All core logic must be indexable and packable into `release/OneDB.php`.
- **CSRF & Security**: Every mutating action must use `SessionCsrf::requireValidToken()`.
- **Modularity**: Keep backend services under `backend/src/Database` and `backend/src/Http` to ensure the packer can resolve them.
