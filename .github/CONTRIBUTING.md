# Contributing to Vulpes Celare

Thank you for your interest in contributing!

---

## Quick Start

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and test: `npm test`
4. Commit with sign-off: `git commit -s -m "feat: your change"`
5. Push and create a Pull Request

---

## Contributor License Agreement (CLA)

By contributing, you agree to these terms:

1. **You retain copyright** to your contributions
2. **Dual license grant:**
   - To the community: AGPL-3.0
   - To the project maintainer: Right to sublicense commercially
3. **Sign-off required:** Add `Signed-off-by: Your Name <email>` to commits

**Why?** This ensures the project can:

- Remain open source for researchers and small organizations
- Offer commercial licenses to large enterprises (funding development)

**For minor contributions** (typos, small docs), the CLA is implicitly accepted via GitHub ToS.

---

## Code Standards

### TypeScript

- Use strict mode
- Explicit return types for public functions
- Avoid `any` unless necessary
- Document complex logic

### Naming Conventions

- **Files:** PascalCase for classes (`NameFilter.ts`)
- **Classes:** PascalCase (`ParallelRedactionEngine`)
- **Functions:** camelCase (`processText`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Testing

- Write tests for new filters
- Never use real PHI - synthetic data only
- Include positive and negative test cases

---

## Filter Development

When creating a filter:

1. Extend `SpanBasedFilter`
2. Implement `findSpans()` method
3. Define priority level
4. Add comprehensive tests
5. Document purpose and limitations

```typescript
export class MyFilter extends SpanBasedFilter {
  readonly priority = FilterPriority.MEDIUM;
  readonly filterType = "MY_IDENTIFIER";

  async findSpans(text: string, context: RedactionContext): Promise<Span[]> {
    // Implementation
  }
}
```

---

## Commit Messages

```text
feat: Add support for international phone formats
fix: Correct false positive on Wilson disease
docs: Update README with new options
test: Add edge case tests for SSN filter
refactor: Simplify span merging logic
```

---

## Code of Conduct

See [CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md).

---

*Thank you for helping improve Vulpes Celare!*
