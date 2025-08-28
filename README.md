# Team Collaboration Platform

A modern team collaboration platform built with React, TypeScript, and Supabase. Features team management, project tracking, analytics, and AI-powered insights.

## 🌟 Features

- **Team Management**: Create and manage teams with role-based access control
- **Project Tracking**: Track project progress with real-time collaboration
- **Analytics Dashboard**: Comprehensive analytics and reporting
- **AI Integration**: AI-powered content analysis and collaboration assistance
- **Real-time Updates**: Live collaboration with instant updates
- **Authentication**: Secure user authentication via Supabase Auth
- **File Storage**: Document and media management with Supabase Storage

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive, utility-first styling
- **React Query** for efficient data fetching and caching
- **React Router** for client-side routing
- **Radix UI** components for accessible UI primitives

### Backend
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** with Row Level Security (RLS) policies
- **Edge Functions** for serverless backend logic
- **Real-time subscriptions** for live collaboration

### Testing
- **Vitest** for unit and integration testing
- **Testing Library** for component testing
- **CI/CD** via GitHub Actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd team-collaboration-platform
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

4. Start the development server:
```bash
npm run dev
```

## 📝 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Testing (Note: Scripts missing due to package.json restrictions)
- `npx vitest run` - Run tests directly
- `npx vitest run --coverage` - Generate coverage report
- `npx tsc --noEmit` - Type check

### Project Structure
```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/                # Utility libraries
├── pages/              # Page components
├── test/               # Test files and utilities
└── utils/              # Utility functions
```

### Database Schema
The application uses Supabase with the following key tables:
- `profiles` - User profile information
- `teams` - Team management
- `projects` - Project tracking
- `collaborations` - Team collaboration data

## 🔒 Security

- Row Level Security (RLS) enabled on all user data tables
- Authentication via Supabase Auth
- Environment variables for sensitive configuration
- CORS and security headers configured
- Regular security audits via GitHub Actions

## 🧪 Testing

Run the test suite:
```bash
# Run all tests (direct command due to package.json restrictions)
npx vitest run

# Run tests in watch mode
npx vitest

# Generate coverage report
npx vitest run --coverage
```

## 📊 Monitoring & Analytics

- Production error tracking via Supabase logging
- Performance monitoring with built-in analytics
- Real-time system health monitoring
- Comprehensive audit logs

## 🚀 Deployment

### Using Lovable
Click the "Publish" button in the Lovable editor to deploy instantly.

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Configure environment variables in your hosting environment
4. Set up Supabase Edge Functions (auto-deployed)

### Custom Domain
Configure custom domains in Project Settings > Domains (requires paid Lovable plan).

## 📚 Documentation

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Developer Guide](./docs/DEVELOPER_GUIDE.md)
- [Testing Guide](./TESTING.md)
- [Production Readiness](./docs/PRODUCTION_READINESS.md)
- [Infrastructure Gaps](./docs/INFRASTRUCTURE_GAPS.md)

## ⚠️ Known Limitations

### Package.json Restrictions
Due to read-only file restrictions, some npm scripts are missing:
- Use `npx vitest run` instead of `npm run test`
- Use `npx vitest run --coverage` instead of `npm run coverage`
- Use `npx tsc --noEmit` instead of `npm run type-check`

See [Infrastructure Gaps](./docs/INFRASTRUCTURE_GAPS.md) for full details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- [Lovable Documentation](https://docs.lovable.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Issues](./issues) for bug reports and feature requests

---

**Project URL**: https://lovable.dev/projects/2e56b6e9-875e-4e78-b518-4792b76006d6