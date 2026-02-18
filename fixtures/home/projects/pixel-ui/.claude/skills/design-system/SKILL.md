---
name: design-system
description: Create new design system components with variants, accessibility, and Storybook stories
metadata:
  role: design-engineering
  tags: [components, design-system, storybook]
---
# Design System Component Creator

Given a component spec, generate a complete design system component:

1. **Component**: React + TypeScript with `forwardRef`, `cva` variants, `cn()` merging
2. **Types**: Full props interface extending HTML attributes
3. **Styles**: Tailwind + CSS custom properties for theme support
4. **Tests**: Vitest + Testing Library covering all variants and interactions
5. **Story**: Storybook stories with controls, playground, and accessibility demos
6. **Export**: Add to barrel export in `src/index.ts`

Follow atomic design principles — classify as atom, molecule, or organism.
Ensure WCAG AA compliance: keyboard nav, focus management, screen reader support.
