import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

// URL del backend (Local o Render)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Login() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState(''); // Contraseña simulada por ahora
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slug) {
      return toast.error("Ingresa el código de tu empresa");
    }

    setLoading(true);

    try {
      // 1. Buscamos el negocio en la base de datos usando el "slug"
      const res = await axios.get(`${API_URL}/api/tenant/${slug.toLowerCase()}`);
      const tenant = res.data;

      // 2. Si existe, guardamos su ID REAL (UUID) y el permiso de admin
      sessionStorage.setItem('tenantId', tenant.id);
      sessionStorage.setItem('isAdmin', 'true');
      
      toast.success(`¡Bienvenido a ${tenant.name}!`);
      
      // 3. Lo mandamos al panel de control
      navigate('/admin');

    } catch (error) {
      console.error(error);
      toast.error("No encontramos ninguna empresa con ese código. Intenta con 'barberia-demo' o 'kine-salud'");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Círculos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="bg-zinc-900/80 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-zinc-800 p-8 relative z-10">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 mb-4 shadow-inner">
            <ShieldCheck size={32} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Acceso SaaS</h1>
          <p className="text-zinc-400 mt-2 text-sm">Ingresa a tu panel de administración</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400 ml-1">Código de Empresa</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 size={18} className="text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="ej: barberia-demo"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400 ml-1">Contraseña (Demo)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-zinc-500" />
              </div>
              <input
                type="password"
                placeholder="Cualquier contraseña funciona"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
              <>
                Ingresar al Panel <ArrowRight size={18} />
              </>
            )}
          </button>

        </form>

        {/* Ayudita para la demo */}
        <div className="mt-8 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 text-center">Códigos de prueba activos</p>
            <div className="flex justify-center gap-4 text-sm">
                <button onClick={() => setSlug('barberia-demo')} className="text-amber-500 hover:underline hover:text-amber-400 transition">barberia-demo</button>
                <span className="text-zinc-700">|</span>
                <button onClick={() => setSlug('kine-salud')} className="text-blue-500 hover:underline hover:text-blue-400 transition">kine-salud</button>
            </div>
        </div>

      </div>
    </div>
  );
}

export default Login;