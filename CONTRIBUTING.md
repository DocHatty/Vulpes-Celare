# Contributing to Vulpes Celare

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

---

## Contributor License Agreement (CLA)

**Before contributing code**, please read the [Contributor License Agreement](CONTRIBUTING_CLA.md).

**TL;DR:**
- You keep copyright to your contributions
- Your contributions are AGPL-3.0 for the community
- Project can include them in commercial licenses (for sustainability)
- Add `Signed-off-by: Your Name <email>` to commits

This ensures the project can:
- Remain open source for researchers and small organizations
- Offer commercial licenses to large enterprises
- Fund ongoing development and maintenance

For details, see [CONTRIBUTING_CLA.md](CONTRIBUTING_CLA.md).

---

## Code of Conduct

- Be respectful and professional
- Focus on the code, not the person
- Provide constructive feedback
- Accept constructive criticism gracefully

---

## How to Contribute

### Reporting Issues

1. **Search existing issues** before creating a new one
2. **Use the issue template** if provided
3. **Include reproduction steps** for bugs
4. **Provide system information** (OS, Node version, etc.)

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit with clear messages
7. Push and create a Pull Request

---

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/vulpes-celare.git
cd vulpes-celare

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

---

## Code Standards

### TypeScript

- Use strict mode
- Provide explicit return types for public functions
- Avoid `any` unless absolutely necessary
- Document complex logic with comments

### Naming Conventions

- **Files**: PascalCase for classes (`NameFilter.ts`), camelCase for utilities
- **Classes**: PascalCase (`ParallelRedactionEngine`)
- **Functions**: camelCase (`processText`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Interfaces**: PascalCase, no "I" prefix (`RedactionResult`, not `IRedactionResult`)

### Testing

- Write tests for new filters
- Include both positive and negative test cases
- Test edge cases
- Never use real PHI in tests - synthetic data only

---

## Filter Development

When creating a new filter:

1. Extend `SpanBasedFilter` base class
2. Implement the required `findSpans()` method
3. Define appropriate priority level
4. Add comprehensive tests
5. Document the filter's purpose and limitations

Example structure:

```typescript
export class MyNewFilter extends SpanBasedFilter {
  readonly priority = FilterPriority.MEDIUM;
  readonly filterType = "MY_IDENTIFIER";

  async findSpans(text: string, context: RedactionContext): Promise<Span[]> {
    // Implementation
  }
}
```

---

## Commit Messages

Use clear, descriptive commit messages:

```
feat: Add support for international phone formats
fix: Correct false positive on Wilson disease
docs: Update README with new configuration options
test: Add edge case tests for SSN filter
refactor: Simplify span merging logic
```

---

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

---

## Questions?

Open an issue for questions about contributing.

---

*Thank you for helping improve Vulpes Celare.*
