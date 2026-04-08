# Deployment Guide - JurisMind AI Frontend

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Build successful
- [ ] Performance optimized

## Development Environment

### Local Setup

```bash
cd frontend/react\ app
npm install
cp .env.example .env
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

### Production Build

```bash
npm run build
```

This generates an optimized production build in the `dist/` directory.

### Build Process

1. TypeScript compilation
2. Minification and tree-shaking
3. Asset optimization
4. CSS processing
5. Bundle analysis

## Deployment Options

### 1. Vercel (Recommended)

**Advantages**: Zero-config deployment, automatic previews, CDN included

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Configuration** (vercel.json):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": ["VITE_API_BASE_URL"]
}
```

### 2. Netlify

**Advantages**: Easy GitHub integration, environment setup

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Configuration** (netlify.toml):
```toml
[build]
command = "npm run build"
publish = "dist"

[env]
VITE_API_BASE_URL = "http://api.example.com"
```

### 3. AWS S3 + CloudFront

**Advantages**: Scalable, cost-effective for static sites

```bash
# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name/

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 4. Traditional Hosting (cPanel, etc.)

```bash
# Build locally
npm run build

# Upload dist/ folder to public_html/
# Configure .htaccess for SPA routing:

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## Environment Variables

### Development
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=JurisMind AI
```

### Production
```env
VITE_API_BASE_URL=https://api.jurismind.com
VITE_APP_NAME=JurisMind AI
```

## Performance Optimization

### Before Deployment

```bash
# Check bundle size
npm run build -- --analyze

# Type check
npm run type-check

# Lint
npm run lint
```

### Optimization Techniques

1. **Code Splitting**: Automatic with Vite
2. **Image Optimization**: Use WebP format
3. **CSS Minification**: Automatic with Vite
4. **JavaScript Minification**: Automatic with Vite
5. **Lazy Loading**: Implement for routes and components

## Monitoring & Analytics

### Recommended Tools

1. **Error Tracking**: Sentry
   ```javascript
   import * as Sentry from "@sentry/react";
   Sentry.init({ dsn: "..." });
   ```

2. **Analytics**: Google Analytics
   ```typescript
   import ReactGA from 'react-ga4';
   ReactGA.initialize('GA_ID');
   ```

3. **Performance**: Web Vitals
   ```typescript
   import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
   ```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm run lint
      - run: npm run type-check
      - name: Deploy
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Domain Configuration

### DNS Setup
1. Point domain to hosting provider's nameservers
2. Configure A/AAAA records for CDN/server
3. Set up SSL certificate (auto with most providers)

### HTTPS
- Use Let's Encrypt (free SSL)
- CDN providers handle automatically (Vercel, Netlify, etc.)

## Post-Deployment Checklist

- [ ] Verify app loads correctly
- [ ] Test all routes working
- [ ] Check API connectivity
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Verify responsive design
- [ ] Check console for errors
- [ ] Verify environment variables
- [ ] Test error handling
- [ ] Monitor performance metrics

## Rollback Procedure

### Vercel
```bash
vercel rollback
```

### Netlify
```bash
netlify deploy --prod --dir=dist --alias=version-name
```

### Manual
1. Keep previous build backup
2. Re-upload previous dist/ folder
3. Clear CDN cache

## Troubleshooting

### White Screen Issue
- Check browser console for errors
- Verify environment variables
- Check API connectivity
- Verify build output

### API Not Found (404)
- Check API base URL
- Verify CORS configuration
- Check backend is running

### Slow Loading
- Check bundle size
- Optimize images
- Enable gzip compression
- Use CDN

### Routing Issues
- Verify SPA rewrite rules
- Check base path in vite.config.ts
- Test refresh on subpaths

## Security Best Practices

1. **Environment Variables**: Never commit API keys
2. **CORS**: Configure backend CORS properly
3. **CSP Headers**: Set Content Security Policy
4. **HTTPS**: Always use SSL/TLS
5. **Dependencies**: Keep packages updated
6. **Secrets**: Use CI/CD secrets management

## Performance Targets

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.8s

## Support & Monitoring

- Monitor error logs regularly
- Set up alerts for deployment failures
- Track performance metrics
- Monitor API error rates
- Review user analytics
