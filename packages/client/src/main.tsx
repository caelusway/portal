import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { PostHogProvider } from 'posthog-js/react';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const options = {
  api_host: import.meta.env.VITE_APP_PUBLIC_POSTHOG_HOST,
};

createRoot(rootElement).render(
  <StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_APP_PUBLIC_POSTHOG_KEY!} options={options}>
      <App />
    </PostHogProvider>
  </StrictMode>
);
