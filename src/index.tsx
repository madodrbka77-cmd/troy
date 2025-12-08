/**
 * @file index.tsx
 * @description Enterprise-grade entry point for the Tourloop Application.
 * Includes Global Error Handling, Strict Mode, and Root Rendering.
 * @author Al-Muhandis
 */

import React, { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

// -----------------------------------------------------------------------------
// 0. Global Styles & Imports
// -----------------------------------------------------------------------------
// CRITICAL: Import Tailwind directives and global styles.
// Required for the classes used in index.html (e.g., bg-[#F0F2F5]) to function.
import './index.css';

import App from './App';

// -----------------------------------------------------------------------------
// 1. Global Error Boundary (Safety Net)
// -----------------------------------------------------------------------------
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * A class component to catch JavaScript errors anywhere in the child component tree,
 * log those errors, and display a fallback UI instead of the component tree that crashed.
 * Styled with Tailwind CSS to match the application theme.
 */
class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // SECURITY/LOGGING: In production, send this to Sentry/Datadog
    console.error('CRITICAL UI ERROR:', error, errorInfo);

    // Enterprise Feature: Auto-recover from ChunkLoadErrors (deployment updates)
    if (error.message.includes('Loading chunk') || error.message.includes('dynamically imported module')) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center dark:bg-gray-900 font-sans" dir="rtl">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 animate-fade-in">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg className="h-8 w-8 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
              عذراً، حدث خطأ غير متوقع
            </h1>
            
            <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              نواجه مشكلة في عرض هذه الصفحة. يرجى تحديث الصفحة أو المحاولة مرة أخرى لاحقاً.
            </p>
            
            <button 
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all active:scale-95"
            >
              تحديث الصفحة
            </button>

            {/* Only show error details in Development environment for debugging */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 overflow-hidden rounded-md bg-gray-100 p-4 text-left text-xs dark:bg-gray-950/50 border border-gray-200 dark:border-gray-700" dir="ltr">
                <code className="text-red-600 dark:text-red-400 font-mono break-all block overflow-x-auto">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// 2. Root Initialization Logic
// -----------------------------------------------------------------------------

const ROOT_ELEMENT_ID = 'root';

/**
 * Safely retrieves the root element and asserts its existence.
 * Throws a descriptive error to halt execution if the environment is corrupt.
 */
const getRootElement = (): HTMLElement => {
  const element = document.getElementById(ROOT_ELEMENT_ID);
  
  if (!element) {
    // Critical Configuration Error
    throw new Error(
      `[FATAL]: Failed to find the root element with ID "${ROOT_ELEMENT_ID}". ` +
      `Ensure <div id="${ROOT_ELEMENT_ID}"></div> exists in your index.html.`
    );
  }
  return element;
};

// -----------------------------------------------------------------------------
// 3. Application Rendering
// -----------------------------------------------------------------------------

const rootElement = getRootElement();
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

// -----------------------------------------------------------------------------
// 4. Performance Monitoring
// -----------------------------------------------------------------------------
// Logic preserved for future analytics integration.