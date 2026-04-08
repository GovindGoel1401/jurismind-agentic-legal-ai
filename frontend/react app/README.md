# JurisMind AI - Frontend

A modern, AI-powered legal intelligence platform built with React, TypeScript, and Vite.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS + Custom CSS
- **UI Components**: ShadCN UI + Radix UI
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide Icons

## Project Structure

```
src/
├── components/      # Reusable React components
├── pages/          # Page components for routes
├── layouts/        # Layout components
├── services/       # API service functions
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── assets/         # Static assets
├── styles/         # Global styles
├── App.tsx         # Main App component
├── main.tsx        # Entry point
└── index.css       # Global CSS with TailwindCSS
```

## Getting Started

### Prerequisites

- Node.js 16+ or higher
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd frontend/react\ app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### Development Server

Start the development server:

```bash
npm run dev
```

The application will open automatically at `http://localhost:5173`

### Building for Production

Build the optimized production bundle:

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Features

### Homepage
- Hero section with call-to-action
- Feature showcase with legal-tech focus
- Premium CTA section
- Smooth animations with Framer Motion

### Case Search
- Full-text search across legal cases
- Filter by year, court, and relevance
- Mock data with realistic legal cases
- Real-time search results

### Dashboard
- Analytics overview with key metrics
- Case analysis tracking
- Research hours saved
- Recent cases view
- Interactive metric cards

## Styling

The theme follows a legal-tech aesthetic with:

- **Primary Colors**: Black and dark grays (`primary-950` to `primary-50`)
- **Accent Color**: Gold (`gold-400` to `gold-600`)
- **Custom Classes**:
  - `.legal-badge` - Styled badges for legal concepts
  - `.card-legal` - Premium card styling with hover effects
  - `.btn-legal` - Gold CTA buttons
  - `.btn-legal-outline` - Outlined legal buttons

## Environment Variables

Create a `.env` file with the following:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=JurisMind AI
```

## API Integration

The frontend uses **mock data** by default for demonstration. To connect to the backend:

1. Update `VITE_API_BASE_URL` in `.env` to your FastAPI backend URL
2. Use the service functions in `src/services/`
3. Enable API calls by removing mock data handling

### Service Examples

```typescript
import caseService from '@/services/caseService'

// Search cases
const results = await caseService.search({
  query: 'constitutional law',
  year: 2023,
  limit: 10
})

// Get case details
const caseDetail = await caseService.getById(1)
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Lazy loading with React Router
- Code splitting with Vite
- Optimized animations with Framer Motion
- Memoized components
- Tree-shaking enabled

## Future Enhancements

- [ ] User authentication
- [ ] Advanced filtering options
- [ ] Case comparison tool
- [ ] Document upload and analysis
- [ ] Real-time collaboration
- [ ] AI-powered case recommendations
- [ ] Export to PDF functionality

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit changes (`git commit -m 'Add AmazingFeature'`)
3. Push to branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on the project repository.
