import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import Login from './Login.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import { Toaster } from 'sonner';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Toaster es para que se vean las notificaciones de éxito/error */}
      <Toaster position="top-center" richColors />
      
      <Routes>
        {/* 1. Si entran a la raíz, los pateamos al Login automáticamente */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 2. Pantallas administrativas */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* 3. El Camaleón (Página de reservas). ¡Debe ir siempre al final! */}
        <Route path="/:slug" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);