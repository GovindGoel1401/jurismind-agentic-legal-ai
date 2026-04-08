# Frontend Architecture - JurisMind AI

## Overview

The frontend is built with a modern React stack focusing on performance, type safety, and user experience. The application follows component-driven design patterns with clear separation of concerns.

## Directory Structure

```
frontend/react app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.tsx       # Navigation bar
│   │   ├── Footer.tsx       # Footer component
│   │   ├── Button.tsx       # Reusable button component
│   │   ├── Card.tsx         # Card wrapper component
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   │
│   ├── pages/               # Page components
│   │   ├── Home.tsx         # Landing page
│   │   ├── Dashboard.tsx    # Analytics dashboard
│   │   ├── CaseSearch.tsx   # Case search page
│   │   └── NotFound.tsx     # 404 page
│   │
│   ├── layouts/             # Layout wrappers
│   │   └── MainLayout.tsx
│   │
│   ├── services/            # API services
│   │   ├── api.ts           # Axios configuration
│   │   └── caseService.ts   # Case-related API calls
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useSearch.ts     # Search hook
│   │   ├── useFetch.ts      # Data fetching hook
│   │   └── index.ts
│   │
│   ├── types/               # TypeScript types
│   │   └── index.ts         # Type definitions
│   │
│   ├── utils/               # Utility functions
│   │   ├── helpers.ts       # Helper functions
│   │   └── constants.ts     # App constants
│   │
│   ├── assets/              # Static assets
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── App.tsx              # Main App component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
│
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── .prettierrc               # Code formatting rules
├── package.json             # Dependencies and scripts
└── README.md                # Project documentation
```

## Component Architecture

### Layout Components
- **Navbar**: Fixed navigation bar with responsive mobile menu
- **Footer**: Footer with links and contact information
- **MainLayout**: Wrapper for consistent layout structure

### Page Components
- **Home**: Landing page with hero section and features
- **Dashboard**: Analytics and metrics display
- **CaseSearch**: Search interface for legal cases
- **NotFound**: 404 error page

### Reusable Components
- **Button**: Configurable button with variants and sizes
- **Card**: Flexible card component with animation
- **LoadingSpinner**: Animated loading indicator
- **ErrorMessage**: Error display with retry option

## Styling Strategy

### TailwindCSS
- Utility-first approach
- Custom theme extension with gold and dark colors
- Responsive design with mobile-first approach

### Custom Utilities in `index.css`
- `.legal-badge`: Styled badges for legal concepts
- `.card-legal`: Premium card styling
- `.btn-legal`: Primary action button
- `.btn-legal-outline`: Outlined action button

### Color Scheme
- **Primary**: Dark colors (black to dark gray)
  - `primary-950` to `primary-50`
- **Accent**: Gold colors
  - `gold-50` to `gold-900`
- **Semantic**: Red for errors, green for success

## State Management

### Local State
- Using React `useState` for component-level state
- Props drilling for passing data between components

### Future Enhancements
- Consider Context API for global state
- Redux or Zustand for complex state management

## Data Flow

### API Integration
```
Component → Hook (useSearch/useFetch) → Service (caseService) → API (axios) → Backend
```

### Service Pattern
```typescript
// services/caseService.ts
export const caseService = {
  search: async (params) => { ... },
  getById: async (id) => { ... },
}

// Usage in component
const results = await caseService.search({ query: 'law' })
```

## Type Safety

### TypeScript Configuration
- Strict mode enabled
- Path mapping with `@/*` alias
- Type definitions in `src/types/index.ts`

### Type Examples
```typescript
interface Case {
  id: number
  title: string
  year: number
  court: string
  relevance: number
}
```

## Performance Optimizations

### Built-in Optimizations
- Lazy route loading with React Router
- Code splitting with Vite
- Tree-shaking for unused code
- Optimized animations with Framer Motion

### Best Practices
- Memoize expensive computations
- Use `memo()` for stable components
- Implement virtual scrolling for large lists
- Optimize images and assets

## Routing

### Routes
- `/` - Home page
- `/dashboard` - Analytics dashboard
- `/case-search` - Case search interface
- `*` - 404 page

### Router Configuration
```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/case-search" element={<CaseSearch />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

## Error Handling

### API Error Handling
- Axios interceptors for request/response
- Error messages displayed to users
- Automatic logout on 401 response
- Retry functionality for failed requests

### Component Error Boundaries
- ErrorMessage component for displaying errors
- User-friendly error messages
- Retry buttons for recoverable errors

## Testing Strategy

### Recommended Testing Tools
- Vitest for unit testing
- React Testing Library for component testing
- Cypress or Playwright for E2E testing

### Testing Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── hooks/
```

## Development Workflow

### Code Quality
```bash
npm run lint          # Check code quality
npm run type-check    # Type check TypeScript
npm run build         # Production build
```

### Development
```bash
npm run dev           # Start dev server
npm run preview       # Preview production build
```

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=JurisMind AI
```

## Browser Support

- Modern browsers (ES2020+)
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

1. **State Management**: Implement Zustand or Context API
2. **Testing**: Add Vitest and React Testing Library
3. **Documentation**: Storybook for component documentation
4. **Performance**: Implement React.memo and useMemo
5. **PWA**: Add service workers for offline support
6. **Accessibility**: Improve ARIA labels and keyboard navigation
7. **Internationalization**: i18n for multiple languages
8. **Analytics**: Track user interactions and events
