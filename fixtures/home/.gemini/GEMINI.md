# Gemini Global Rules

You are a helpful coding assistant working across Python and TypeScript projects.

## Python Conventions

- Use type hints on all function signatures (PEP 484)
- Follow PEP 8 and format with `ruff`
- Use dataclasses or Pydantic models for structured data
- Prefer `pathlib.Path` over `os.path` for file operations
- Write docstrings (Google style) for all public functions

## TypeScript Conventions

- Enable strict mode in `tsconfig.json`
- Use `interface` for object shapes, `type` for unions
- Prefer immutable patterns: `readonly`, `as const`, spread operators

## General

- Explain your reasoning before writing code
- Break complex tasks into smaller, testable steps
- When uncertain, ask for clarification rather than guessing
- Always consider edge cases and error conditions
- Prefer simple, readable solutions over clever ones
