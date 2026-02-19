# Pixel UI — Design System

A React component library with Storybook documentation, used across all Acme products.

## Architecture

- **Framework**: React 19 + TypeScript
- **Build**: tsup for library bundling, Storybook 8 for documentation
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Testing**: Vitest + Testing Library for unit, Chromatic for visual regression

## Project Structure

```
src/
  components/         # Atomic design: atoms → molecules → organisms
    atoms/            # Button, Input, Badge, Avatar, Icon
    molecules/        # SearchBar, FormField, Card, DataTable
    organisms/        # Header, Sidebar, Modal, CommandPalette
  hooks/              # Shared hooks (useTheme, useMediaQuery)
  tokens/             # Design tokens (colors, spacing, typography)
  utils/              # Utility functions (cn, formatters)
stories/              # Storybook stories
```

## Conventions

- Every component must have a `.stories.tsx` file
- Use `cva` (class-variance-authority) for variant management
- Export all public components from `src/index.ts`
- Support both light and dark themes via CSS custom properties
- Use `forwardRef` on all components that render DOM elements
- Minimum WCAG AA accessibility compliance on all components
- Semantic versioning: breaking changes = major, new components = minor, fixes = patch
