---
paths:
  - "src/components/**"
---
# Component Standards

- Every component accepts a `className` prop merged via `cn()`
- Use `cva` for defining variant styles — never inline conditional classes
- All props interfaces must extend `React.HTMLAttributes` of the root element
- Destructure common props: `{ className, children, ...props }`
- Use `React.forwardRef` on all components
- Default to `role` and `aria-*` attributes for accessibility
- Include JSDoc comments on the component and all non-obvious props
