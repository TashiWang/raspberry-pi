// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Global CSS for Tailwind
import App from './App'; // Removed .js extension
import './App.css'; // Custom styles for the app

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
