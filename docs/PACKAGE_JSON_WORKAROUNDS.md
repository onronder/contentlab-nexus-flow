# Package.json Scripts Workaround

## Issue
The `package.json` file is read-only in this environment, preventing the addition of essential npm scripts for testing, type-checking, and coverage generation.

## Required Scripts
The following scripts should be added to `package.json` for full production readiness:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development", 
    "lint": "eslint .",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage",
    "coverage:html": "vitest run --coverage --reporter=html"
  }
}
```

## Current Workarounds

### CI Pipeline
The GitHub Actions workflow has been updated to use direct npx commands instead of npm scripts:

- `npm run type-check` → `npx tsc --noEmit`
- `npm run lint` → `npx eslint .`
- `npm run test` → `npx vitest run`
- `npm run coverage` → `npx vitest run --coverage`

### Local Development
Developers should use the direct commands:

```bash
# Type checking
npx tsc --noEmit

# Linting
npx eslint .

# Testing
npx vitest run           # Run tests once
npx vitest              # Watch mode
npx vitest --ui         # UI mode

# Coverage
npx vitest run --coverage
```

## Manual Setup Required
If you have write access to `package.json`, add the scripts above to enable standard npm workflows. This is the only remaining blocker for complete production readiness.