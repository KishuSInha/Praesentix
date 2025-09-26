import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import App from './App.tsx';
import i18n from './i18n.ts'; // Your i18n configuration file
import './index.css'; // Your global stylesheet

// 1. Find the root DOM element in your public/index.html file
const rootElement = document.getElementById('root');

// Ensure the root element exists before proceeding
if (!rootElement) {
  throw new Error("Failed to find the root element. Make sure your index.html has an element with id='root'.");
}

// 2. Create a React root to manage rendering inside that element
const root = createRoot(rootElement);

// 3. Render the application into the root
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);