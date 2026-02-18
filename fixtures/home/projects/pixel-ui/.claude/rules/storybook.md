---
paths:
  - "stories/**"
  - "**/*.stories.tsx"
---
# Storybook Rules

- Every component must have a default story and at least one variant story
- Use `args` for interactive controls — avoid hardcoding props in stories
- Group stories by atomic design level: Atoms, Molecules, Organisms
- Include a "Playground" story with all controls exposed
- Add an "Accessibility" story that demonstrates keyboard navigation
- Use `decorators` for common wrappers (ThemeProvider, padding)
