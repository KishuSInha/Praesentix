import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
    <App />
  </React.StrictMode>
);