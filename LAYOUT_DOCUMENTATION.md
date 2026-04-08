# JurisMind AI - Layout & UI Documentation

## Overview

This document describes the main application layout, component structure, and design system for JurisMind AI.

## Layout Components

### 1. Navbar (Header)

**Location**: `src/components/Navbar.tsx`

**Features**:
- Fixed sticky header with backdrop blur effect
- Logo with ⚖ icon on the left
- Center navigation menu (responsive)
- Right-side actions: Feedback, Theme toggle, User profile

**Navigation Links**:
- Home (`/`)
- Analyze Case (`/analyze`)
- Similar Cases (`/similar-cases`)
- About (`/about`)
- Contact (`/contact`)

**Mobile Behavior**:
- Hamburger menu for navigation on screens < 1024px
- Dropdown menu collapses to mobile-friendly state
- User profile menu with account settings

**Props**:
```typescript
interface NavbarProps {
  onSidebarToggle?: () => void
  isDarkMode?: boolean
  onThemeToggle?: () => void
}
```

### 2. Sidebar

**Location**: `src/components/Sidebar.tsx`

**Features**:
- Visible only on dashboard routes (when `showSidebar={true}`)
- Responsive: Fixed on desktop, slide-out drawer on mobile
- 8 main menu items with badges for new/beta features
- Smooth animations with Framer Motion
- "Pro Features" upgrade section at bottom

**Menu Items**:
1. Dashboard (`/dashboard`)
2. Case Input (`/case-input`) - "New" badge
3. AI Analysis (`/ai-analysis`)
4. Debate Simulation (`/debate`) - "Beta" badge
5. Verdict (`/verdict`)
6. Similar Cases (`/similar-cases`)
7. Lawyer Review (`/lawyer-review`)
8. Feedback (`/feedback`)

**Active State**:
- Current page highlighted with gold background
- Animated chevron indicator
- Border accent color changes

**Mobile Overlay**:
- Semi-transparent backdrop when sidebar is open
- Click outside to close
- Close button in top-right on mobile

**Props**:
```typescript
interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}
```

### 3. Footer

**Location**: `src/components/Footer.tsx`

**Sections**:
1. **Brand Info** (top-left)
   - Logo and description
   - Social media links (Twitter, LinkedIn, GitHub)

2. **Footer Links** (5 columns)
   - Product (Features, Pricing, Case Search, AI Analysis)
   - Company (About, Blog, Careers, Press)
   - Resources (Documentation, API Docs, Guides, FAQ)
   - Legal (Privacy, Terms, Cookie Policy, Disclaimer)

3. **Contact Section**
   - Email: hello@jurismind.ai
   - Phone: +1 (800) LAW-5AI1
   - Location: San Francisco, CA

4. **Bottom Section**
   - Copyright notice
   - Legal disclaimer
   - Quick links (Privacy, Terms, Sitemap)
   - Service status indicator

**Design**:
- Gradient background
- Multiple sections with clear hierarchy
- Hover effects on links
- Status indicator showing service health

### 4. MainLayout

**Location**: `src/layouts/MainLayout.tsx`

**Purpose**: 
Wrapper component that combines Navbar, optional Sidebar, main content, and Footer

**Features**:
- Manages sidebar open/close state
- Theme toggle functionality
- Smooth transitions between pages
- Responsive layout

**Props**:
```typescript
interface MainLayoutProps {
  children: ReactNode
  showSidebar?: boolean
  showFooter?: boolean
  isDarkMode?: boolean
  onThemeToggle?: () => void
}
```

**Usage**:
```typescript
<MainLayout showSidebar={true} isDarkMode={isDarkMode}>
  <Dashboard />
</MainLayout>
```

## Page Routes

### Public Pages (No Sidebar)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Landing page with hero section |
| `/analyze` | Analyze | Case analysis workflow overview |
| `/case-search` | CaseSearch | Search legal cases and precedents |
| `/about` | About | About company (placeholder) |
| `/contact` | Contact | Contact form (placeholder) |

### Dashboard Pages (With Sidebar)

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | Dashboard | Main analytics dashboard |
| `/case-input` | CaseInput | Upload and manage case documents |
| `/ai-analysis` | AIAnalysis | AI-powered case analysis results |
| `/debate` | DebateSimulation | Courtroom debate simulation |
| `/verdict` | Verdict | AI-predicted case verdict |
| `/similar-cases` | CaseSearch | Find similar legal cases |
| `/lawyer-review` | LawyerReview | Submit for professional review |
| `/feedback` | Feedback | Send feedback and suggestions |

## Design System

### Color Scheme

**Primary Colors**:
- Background: `primary-950` to `primary-50` (black to light gray)
- Main background: `primary-950`
- Secondary background: `primary-900`
- Cards: `primary-800` to `primary-700`

**Accent Color**:
- Gold: `gold-400` to `gold-600`
- Used for: Links, buttons, highlights, hover states

**Semantic Colors**:
- Success: Green (`green-400`)
- Warning: Amber (`amber-400`)
- Error: Red (`red-400`)
- Info: Blue (`blue-400`)

### Typography

**Font Hierarchy**:
- H1 (5xl): Page titles
- H2 (3xl): Section headers
- H3 (2xl): Subsection headers
- Body: Default paragraph text
- Small: Secondary text, captions

### Spacing System

```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
```

### Components

#### Button Variants

**Primary** (`.btn-legal`):
- Gold background, dark text
- Full rounded corners
- Hover: Brighter gold background

**Outline** (`.btn-legal-outline`):
- Transparent background, gold border
- Hover: Semi-transparent gold background

**Secondary** (`.btn-secondary`):
- Dark background
- Hover: Lighter background

#### Card Component

**Basic Card** (`.card-legal`):
- Dark gradient background
- Border with subtle gold accent
- Hover effect: elevated appearance
- Smooth transitions

**Sizes**:
- sm, md (default), lg

#### Badges

**Legal Badge** (`.legal-badge`):
- Gold background with transparency
- Small pill shape
- Used for: Tags, status indicators

### Animations

**Built-in Animations**:
- Fade-in on scroll
- Slide-up on page load
- Scale on hover
- Smooth transitions (200-300ms)
- Spring physics for sidebar animations

**Framer Motion Usage**:
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

## Responsive Design

### Breakpoints

| Breakpoint | Width | Classes |
|-----------|-------|---------|
| Mobile | < 640px | default |
| Tablet | 640px - 1024px | sm: to lg: |
| Desktop | ≥ 1024px | lg: |

### Layout Behavior

**Mobile (< 640px)**:
- Single column layout
- Sidebar: Full-screen slide-out drawer
- Navbar: Hamburger menu
- Footer: Single column links

**Tablet (640px - 1024px)**:
- 2-column layout where applicable
- Sidebar: Hidden by default, toggle available
- Navbar: Simplified navigation

**Desktop (≥ 1024px)**:
- Multi-column layout
- Sidebar: Always visible
- Full navigation menu
- Optimized spacing

## Component Usage Examples

### Using MainLayout

```typescript
// Page with sidebar
<MainLayout showSidebar={true}>
  <Dashboard />
</MainLayout>

// Public page without sidebar
<MainLayout showSidebar={false}>
  <Home />
</MainLayout>
```

### Using Navbar

The Navbar is included automatically in MainLayout. To customize:

```typescript
<Navbar
  onSidebarToggle={toggleSidebar}
  isDarkMode={isDarkMode}
  onThemeToggle={toggleTheme}
/>
```

### Using Sidebar

Sidebar is automatically managed by MainLayout when `showSidebar={true}`.

To use independently:

```typescript
<Sidebar 
  isOpen={sidebarOpen} 
  onClose={closeSidebar} 
/>
```

## Accessibility Features

### ARIA Labels

- Navigation menus have proper ARIA labels
- Buttons include title attributes for tooltips
- Links have descriptive text

### Keyboard Navigation

- Tab-through menu items
- Enter key activates buttons
- Escape closes mobile menus
- Sidebar accessible via keyboard

### Color Contrast

- Text contrast ratio ≥ 4.5:1 (WCAG AA standard)
- Gold accent readable on dark backgrounds
- Error, success, warning states not color-only

## Theme System

### Dark Mode (Default)

Currently implemented with dark colors:
- Black backgrounds
- White text
- Gold accents

### Future Theme Support

Theme toggle button ready for:
- Light mode implementation
- Custom theme selection
- User preferences localStorage

## Performance Optimizations

### Bundle Size

- Component tree-shaking enabled
- Lazy loading for routes
- Icon optimization (Lucide)

### Animations

- GPU-accelerated transforms
- Optimized transition timing
- Reduced motion respect (future)

### Responsive Images

- Lazy loading ready
- TailwindCSS image optimization
- SVG icons for sharp display

## Customization Guide

### Changing Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: { /* ... */ },
      gold: { /* ... */ },
    }
  }
}
```

### Adding Menu Items

Edit `Sidebar.tsx` `menuItems` array:

```typescript
const menuItems = [
  {
    id: 'new-item',
    label: 'New Item',
    href: '/new-item',
    icon: IconName,
    badge: 'New'
  }
]
```

### Modifying Navbar Links

Edit `Navbar.tsx` `navLinks` array:

```typescript
const navLinks = [
  { label: 'Link', href: '/link' }
]
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: Latest versions

## Known Issues & Limitations

1. **Theme Toggle**: Currently visual only, needs localStorage implementation
2. **Responsive**: Sidebar drawer might need refinement for very small screens
3. **Footer**: Some links are placeholders

## Future Improvements

- [ ] Light mode implementation
- [ ] Theme persistence (localStorage)
- [ ] Breadcrumb navigation
- [ ] Search functionality in navbar
- [ ] User profile dropdown with real data
- [ ] Notification system
- [ ] Toast notifications
- [ ] Mobile pagination optimization
- [ ] Accessibility audit
- [ ] RTL language support

## Troubleshooting

### Sidebar not showing
- Ensure `showSidebar={true}` in MainLayout
- Check that onClose callback is properly handled
- Verify sidebar state management in page

### Navbar not appearing
- MainLayout automatically includes Navbar
- Check that page is wrapped in MainLayout

### Styling issues
- Verify TailwindCSS is properly imported
- Check `index.css` for custom styles
- Ensure responsive class names are correct

## Resources

- [TailwindCSS Documentation](https://tailwindcss.com)
- [Framer Motion API](https://www.framer.com/motion)
- [React Router Documentation](https://reactrouter.com)
- [Lucide Icons](https://lucide.dev)

---

**Last Updated**: March 2025
**Version**: 1.0.0
