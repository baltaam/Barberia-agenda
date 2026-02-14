import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner' // <--- IMPORTANTE: Importamos el Toaster

import App from './App'
import AdminDashboard from './AdminDashboard'
import Login from './Login'
import ProtectedRoute from './ProtectedRoute'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Agregamos el Toaster aquí con tema oscuro */}
      <Toaster richColors position="top-center" theme="dark" />
      
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)