import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // EN PRODUCCIÓN: Esto debería validar contra el Backend.
    // PARA EL PROTOTIPO: Usamos una contraseña fija.
if (password === 'admin123') {
      // CAMBIO: Usamos sessionStorage (se borra al cerrar la pestaña)
      sessionStorage.setItem('isAdmin', 'true'); 
      navigate('/admin');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Lock className="text-blue-600" size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Acceso Admin</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Entrar
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-blue-600">← Volver a Reservas</a>
        </div>
      </div>
    </div>
  );
}

export default Login;