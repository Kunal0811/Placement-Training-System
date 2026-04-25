import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import { Analytics } from "@vercel/analytics/react"

createRoot(document.getElementById('root')).render(

    <AuthProvider>
      <App />
      <Analytics />
    </AuthProvider>
  
);
