# TourLoop - Enterprise-grade Real-time Tour Management System

## Overview
TourLoop is an enterprise-grade social media application built with React, TypeScript, and Vite. It features a Facebook-like interface with real-time tour management capabilities and Google Gemini AI integration for content generation.

## Recent Changes
- **December 08, 2025**: Initial GitHub import setup for Replit environment
  - Created missing configuration files (Tailwind, PostCSS)
  - Added translations system for Arabic/English support
  - Configured Vite for Replit (port 5000, host 0.0.0.0)
  - Reorganized project structure (moved context/services to src/)
  - Set up development workflow

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS with custom theme
- **AI Integration**: Google Gemini API for content generation
- **Real-time**: Socket.IO client (configured but not actively used)
- **State Management**: React Context API (Language, Theme)
- **Type Safety**: TypeScript with strict mode enabled

### Directory Structure
```
├── src/
│   ├── components/       # React components (Navbar, Feed, Profile, etc.)
│   ├── context/         # Context providers (Language, Theme)
│   ├── services/        # External services (Gemini AI)
│   ├── App.tsx          # Main application component
│   ├── index.tsx        # Entry point with error boundary
│   ├── index.css        # Global styles and Tailwind directives
│   ├── types.ts         # TypeScript type definitions
│   └── translations.ts  # i18n translations (AR/EN)
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

### Key Features
1. **Social Media Interface**: Posts, stories, photos, videos, messaging
2. **AI Content Generation**: Google Gemini integration for post creation
3. **Multi-language Support**: Arabic (RTL) and English (LTR)
4. **Dark/Light Theme**: Theme switching capability
5. **Profile Management**: Avatar, cover photos, albums
6. **Real-time Ready**: Socket.IO client configured

## Configuration

### Environment Variables
- `VITE_GOOGLE_API_KEY`: Google Gemini API key for AI features
- `VITE_API_URL`: Backend API URL (optional, for proxy setup)
- `VITE_PORT`: Development server port (default: 5000)
- `VITE_PREVIEW_PORT`: Preview server port (default: 8080)

### Development Server
- Port: 5000
- Host: 0.0.0.0 (for Replit proxy compatibility)
- Allowed Hosts: All (required for Replit iframe preview)
- Cache Control: Disabled for development

### Build Configuration
- Output: `dist/`
- Code Splitting: Enabled with vendor chunking
- Minification: Terser with production optimizations
- Source Maps: Enabled in development only

## User Preferences
None configured yet.

## Notes
- The application uses mock data for demonstration
- Google Gemini API key is optional; fallback content is provided
- Security headers are configured for production builds
- The project follows RTL-first design for Arabic language support
