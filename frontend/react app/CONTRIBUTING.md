# Contributing Guide - JurisMind AI Frontend

Thank you for your interest in contributing to JurisMind AI Frontend! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Take responsibility for your contributions
- Report security vulnerabilities privately

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/yourname/jurismind-ai-frontend.git
cd jurismind-ai-frontend
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/feature-name
# or
git checkout -b fix/bug-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### 3. Development Setup

```bash
npm run dev
```

Start making your changes!

## Development Standards

### Code Style

- Use TypeScript for all new code
- Follow ESLint rules: `npm run lint`
- Format code with Prettier: `.prettierrc`
- Use single quotes for strings
- Maximum line length: 100 characters

### Component Guidelines

```typescript
// ✅ Good: Named export with proper types
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <button className={`btn-${variant}`} {...props} />
}

// ❌ Bad: Anonymous exports, missing types
export default ({ variant, ...props }) => (
  <button className={`btn-${variant}`} {...props} />
)
```

### Naming Conventions

- **Components**: PascalCase (Button.tsx, NavBar.tsx)
- **Hooks**: camelCase starting with 'use' (useSearch.ts)
- **Services**: camelCase (caseService.ts)
- **Types**: PascalCase (Case, SearchParams)
- **Variables/Functions**: camelCase (handleClick)

### TypeScript Standards

```typescript
// Always provide types
interface Props {
  name: string
  age: number
  onSubmit: (data: FormData) => Promise<void>
}

function Component({ name, age, onSubmit }: Props) {
  // Component code
}
```

## File Structure

### Component Files

```typescript
// Button.tsx
import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

export default function Button({ variant = 'primary', ...props }: ButtonProps) {
  // Implementation
}
```

### Service Files

```typescript
// caseService.ts
import apiClient from './api'

export interface CaseSearchParams {
  query: string
}

const caseService = {
  search: async (params: CaseSearchParams) => {
    // Implementation
  }
}

export default caseService
```

### Hook Files

```typescript
// useSearch.ts
import { useState, useCallback } from 'react'

export const useSearch = (initialValue = '') => {
  const [query, setQuery] = useState(initialValue)
  
  const reset = useCallback(() => setQuery(''), [])
  
  return { query, setQuery, reset }
}
```

## Commit Guidelines

### Commit Messages

Follow conventional commits format:

```
feat: add case search filter
fix: resolve navbar menu alignment
docs: update API documentation
refactor: simplify button component logic
chore: update dependencies
test: add component tests
```

### Commit Best Practices

- Make small, atomic commits
- Write clear, descriptive messages
- Reference issues when applicable
- One feature/fix per commit

Example:
```bash
git commit -m "feat: add case relevance filter (#123)"
```

## Pull Request Process

### 1. Before Submitting

```bash
# Update main branch
git checkout main
git pull origin main

# Rebase your branch
git rebase main

# Run tests and linting
npm run lint
npm run type-check
npm run build
```

### 2. Create Pull Request

**Title**: Clear, descriptive title
- ✅ `feat: add case search filters`
- ❌ `fix bug`

**Description**: Include:
- What changes were made
- Why these changes were needed
- How to test the changes
- Related issues/PRs

**Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Screenshots
If applicable, add screenshots

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
```

### 3. Code Review

- Address feedback promptly
- Explain reasoning where needed
- Update PR based on review
- Rebase and force push if requested

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Testing Standards

- Test critical paths
- Aim for 80%+ coverage
- Write descriptive test names
- Keep tests focused and isolated

### Example Test

```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react'
import Button from './Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    screen.getByText('Click').click()
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## Documentation

### Code Comments

```typescript
// ✅ Good: Explains why, not what
// User's search query state for case lookup
const [query, setQuery] = useState('')

// ❌ Bad: States the obvious
// Set query state
const [query, setQuery] = useState('')
```

### README Documentation

Update relevant sections if:
- Adding new features
- Changing setup process
- Modifying API contract
- Updating dependencies

### JSDoc Comments

```typescript
/**
 * Searches for legal cases based on query parameters
 * @param params - Search parameters including query, year, court
 * @returns Promise containing array of case results
 * @throws Error if API request fails
 */
async function searchCases(params: CaseSearchParams): Promise<Case[]> {
  // Implementation
}
```

## Performance Considerations

### Do's
- ✅ Use React.memo for stable components
- ✅ Implement useCallback for event handlers
- ✅ Lazy load routes and components
- ✅ Optimize images
- ✅ Use CSS classes instead of inline styles

### Don'ts
- ❌ Avoid unnecessary re-renders
- ❌ Don't create new objects in render
- ❌ Avoid large bundle sizes
- ❌ Don't block main thread
- ❌ Avoid memory leaks

## Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation
- Test with screen readers
- Maintain proper contrast ratios

## Security

- Never commit secrets/API keys
- Validate all user inputs
- Use HTTPS for API calls
- Keep dependencies updated
- Report security issues privately

## Troubleshooting

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### ESLint Errors

```bash
# Check issues
npm run lint

# Auto-fix
npm run lint -- --fix
```

### TypeScript Errors

```bash
# Type check
npm run type-check

# Check specific file
npx tsc --noEmit src/components/Button.tsx
```

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide)
- [React Router Docs](https://reactrouter.com)

## Questions?

- Open a GitHub issue
- Check existing issues/discussions
- Join our dev Discord/Slack
- Email: dev@jurismind.ai

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project readme

Thank you for contributing to JurisMind AI! 🚀
