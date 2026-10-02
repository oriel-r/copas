# @copas/ui

Shared UI component library and design system for the Copas monorepo.

## Overview

This package contains:
- UI components built with [shadcn/ui](https://ui.shadcn.com/) and [Radix UI](https://www.radix-ui.com/).
- Shared Tailwind CSS v4 variables and base styles (`src/styles.css`).
- Utility functions like `cn` (`src/lib/utils.ts`).

## Usage

In any workspace application, add the package as a dependency:

```json
{
  "dependencies": {
    "@copas/ui": "workspace:*"
  }
}
```

Import components directly from the package root:

```tsx
import { Button, Card, cn } from '@copas/ui';
```

Import base styles in your app's global CSS:

```css
@import "@copas/ui/styles.css";
```

## Adding new components

The `components.json` is configured here. To add a new shadcn component, run inside this package:

```bash
npx shadcn-ui@latest add <component>
```

> **Note:** Are there any specific naming conventions for new UI components in this monorepo? (Pending definition)
