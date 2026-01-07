# Development Guide

This document provides guidance for AI agents and contributors working on this project.

## Architecture Overview

### Frontend (app/)
- `components/ui/` - shadcn-vue UI components
- `components/FileManager.vue` - Main file management component
- `pages/index.vue` - Dashboard page
- `pages/login.vue` - Login page
- `middleware/auth.ts` - Client-side auth middleware

### Backend (server/)
- `api/auth/` - OAuth authentication endpoints
- `api/files/` - File management API (CRUD operations)
- `middleware/cors.ts` - Origin-based access control
- `routes/images/` - Public image serving

## Tech Stack

- Nuxt 4 + Vue 3
- NuxtHub (Cloudflare R2 blob storage)
- nuxt-auth-utils (GitHub OAuth)
- shadcn-vue + Tailwind CSS 4
- @nuxtjs/color-mode (theme)

## Key Patterns

### File Storage
Files are stored in R2 with path-based virtual folders. The `pathname` field represents the full path including folder structure.

### Authentication
GitHub OAuth flow with session-based auth. Protected routes use middleware to check session state.

### Origin Control
The `NUXT_ALLOWED_ORIGINS` env var controls which domains can access blob resources. Supports wildcards like `*.example.com`.

## Development Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript check
```
