import { useState, useEffect } from 'react';
import { Calendar, Clock, Trash2, LogOut, DollarSign, Activity, Search, ShieldBan, Plus } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

// --- CONFIGURACIÓN PARA VERCEL Y RENDER ---
// Si estás en local usará localhost, si estás en Vercel usará la URL de Render (debes configurarla en Vercel)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Tipos
interface Appointment { id: string; professionalId: string; startTime: string; service: { name: string; price: string; durationMin: number }; customer: { name: string; email: string; phone?: string }; }
interface Professional { id: string; name: string; }
interface BlockedDate { id: string; date: string; reason: string; }

function AdminDashboard() {
  const navigate = useNavigate();
  
  // Identidad del negocio actual (Simulamos que se guardó al hacer Login)
  const tenantId = sessionStorage.getItem('tenantId') || 'barberia-demo'; 

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProf, setSelectedProf] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]); 
  const [loading, setLoading] = useState(false);
  
  const [blockDateInput, setBlockDateInput] = useState('');
  const [blockReason, setBlockReason] = useState('Día Libre');

  // --- FUNCIONES ---

  const handleLogout = () => { 
    sessionStorage.removeItem('isAdmin'); 
    sessionStorage.removeItem('tenantId');
    navigate('/login'); 
  };

  const handleDelete = async (id: string) => {
    toast.promise(axios.delete(`${API_URL}/appointments/${id}`), {
      loading: 'Eliminando...',
      success: () => { fetchAppointments(selectedProf, selectedDate); return 'Turno eliminado'; },
      error: 'Error'
    });
  };

  // --- FUNCIONES DE BLOQUEO (CORREGIDAS) ---
  const fetchBlocks = async (profId: string) => {
    try {
      // BUG ARREGLADO: Antes llamaba a /professionals, ahora llama a /api/blocks
      const res = await axios.get(`${API_URL}/api/blocks`, { params: { professionalId: profId } });
      setBlockedDates(res.data);
    } catch (error) {
      console.error("Error cargando bloqueos", error);
    }
  };

  const handleBlockDate = async () => {
    if (!blockDateInput) return toast.error("Selecciona una fecha para bloquear");
    
    // Convertimos la fecha correctamente para evitar problemas de zona horaria
    const dateObj = new Date(blockDateInput + 'T00:00:00');

    toast.promise(
      axios.post(`${API_URL}/api/blocks`, {
        professionalId: selectedProf,
        date: dateObj.toISOString(),
        reason: blockReason
      }),
      {
        loading: 'Bloqueando fecha...',
        success: () => {
            fetchBlocks(selectedProf);
            setBlockDateInput('');
            return '¡Fecha bloqueada exitosamente! 🚫';
        },
        error: 'Error al bloquear'
      }
    );
  };

  const handleUnblock = async (id: string) => {
    toast.promise(axios.delete(`${API_URL}/api/blocks/${id}`), {
      loading:"Habilitando fecha nuevamente...",
      success:()=> {
        fetchBlocks(selectedProf);
        return "Día desbloqueado. ¡Agenda abierta! ✅";
      },
      error:"No se pudo desbloquear ese día",
    });
  };

// --- FUNCIONES DE TURNOS (CORREGIDAS PARA MULTI-TENANT) ---
  const fetchAppointments = async (profId: string, dateStr: string) => {
    if (!profId) return;
    setLoading(true);
    try {
      // 1. Llamamos a la ruta correcta en tu backend de Render y le pasamos el tenantId
      const res = await axios.get(`${API_URL}/appointments`, {
        params: { tenantId: tenantId }
      });
      
      // 2. Filtramos la lista para mostrar SOLO los turnos de la fecha y profesional seleccionados en pantalla
      const turnosFiltrados = res.data.filter((turno: Appointment) => 
        turno.professionalId === profId && 
        turno.startTime.startsWith(dateStr)
      );

      setAppointments(turnosFiltrados);
    } catch (error) { 
      console.error("Error cargando turnos:", error); 
    } finally { 
      setLoading(false); 
    }
  };
  // --- CARGA INICIAL (CON AISLAMIENTO SAAS) ---
  useEffect(() => {
    // Solo pedimos los profesionales de ESTE negocio (tenantId)
    axios.get(`${API_URL}/professionals`, { params: { tenantId } })
      .then(res => {
        const profs = res.data; // Ajustado según lo que devuelve tu backend
        setProfessionals(profs);
        if (profs.length > 0) {
          setSelectedProf(profs[0].id);
          fetchAppointments(profs[0].id, selectedDate);
          fetchBlocks(profs[0].id); 
        }
      });
  }, [tenantId]); // Se recarga si cambia el negocio

  const handleProfChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProfId = e.target.value;
    setSelectedProf(newProfId);
    fetchAppointments(newProfId, selectedDate);
    fetchBlocks(newProfId); 
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchAppointments(selectedProf, newDate);
  };

  const dailyTotal = appointments.reduce((sum, appt) => sum + Number(appt.service.price), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black pb-20">
      
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg text-black"><Activity size={24} /></div>
            <div><h1 className="text-xl font-bold text-white">Panel de Administración</h1></div>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
             <select className="bg-transparent text-sm text-white font-medium px-3 py-2 outline-none cursor-pointer" value={selectedProf} onChange={handleProfChange}>
               {professionals.map(p => <option key={p.id} value={p.id} className="bg-zinc-800">{p.name}</option>)}
             </select>
             <div className="w-px h-6 bg-zinc-800"></div>
             <input type="date" className="bg-transparent text-sm text-zinc-300 font-medium px-3 py-2 outline-none" style={{colorScheme: 'dark'}} value={selectedDate} onChange={handleDateChange}/>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-950/30 rounded-lg transition"><LogOut size={16} /><span className="hidden md:inline">Salir</span></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10"><Calendar size={80} className="text-blue-500"/></div>
            <div className="text-zinc-500 text-sm font-medium mb-1 uppercase tracking-widest">Turnos Hoy</div>
            <div className="text-4xl font-black text-white">{appointments.length}</div>
          </div>
          <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
             <div className="absolute right-0 top-0 p-4 opacity-10"><DollarSign size={80} className="text-green-500"/></div>
            <div className="text-zinc-500 text-sm font-medium mb-1 uppercase tracking-widest">Caja Estimada</div>
            <div className="text-4xl font-black text-white">${dailyTotal}</div>
          </div>
          <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
             <div className="absolute right-0 top-0 p-4 opacity-10"><Clock size={80} className="text-amber-500"/></div>
            <div className="text-zinc-500 text-sm font-medium mb-1 uppercase tracking-widest">Próximo Cliente</div>
            <div className="text-3xl font-bold text-white truncate">{appointments.length > 0 ? appointments[0].customer.name.split(' ')[0] : '-'}</div>
          </div>
        </div>

        {/* --- SECCIÓN PRINCIPAL: AGENDA --- */}
        <div className="bg-zinc-900/50 backdrop-blur rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl mb-12">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Calendar className="text-amber-500" size={20}/> Agenda Detallada</h2>
            <div className="text-xs text-zinc-500 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">{selectedDate}</div>
          </div>
          
          {loading ? (
            <div className="p-20 text-center text-zinc-500 flex flex-col items-center animate-pulse"><Search size={40} className="mb-4 opacity-50"/><p>Sincronizando...</p></div>
          ) : appointments.length === 0 ? (
            <div className="p-20 text-center text-zinc-600 flex flex-col items-center"><Calendar size={40} className="mb-4 opacity-50 text-zinc-700"/><p>Sin turnos para este día</p></div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {appointments.map((appt) => {
                const time = new Date(appt.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return (
                  <div key={appt.id} className="p-5 hover:bg-zinc-800/50 transition flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="bg-zinc-950 border border-zinc-800 w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white">{time}</div>
                      <div>
                        <h3 className="font-bold text-lg text-white group-hover:text-amber-500 transition">{appt.customer.name}</h3>
                        <div className="text-zinc-500 text-sm">{appt.service.name} • {appt.customer.phone || 'Sin teléfono'}</div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(appt.id)} className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={20}/></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- SECCIÓN DE BLOQUEOS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Formulario de Bloqueo */}
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-red-500/20 p-2 rounded-lg text-red-500"><ShieldBan size={24}/></div>
                    <h2 className="text-xl font-bold text-white">Bloquear Fecha</h2>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Fecha a bloquear</label>
                        <input 
                            type="date" 
                            className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none focus:border-red-500 transition"
                            style={{colorScheme: 'dark'}}
                            onChange={e => setBlockDateInput(e.target.value)}
                            value={blockDateInput}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Motivo</label>
                        <select 
                            className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none"
                            onChange={e => setBlockReason(e.target.value)}
                            value={blockReason}
                        >
                            <option>Día Libre / Franco</option>
                            <option>Vacaciones</option>
                            <option>Enfermedad</option>
                            <option>Feriado</option>
                            <option>Otro</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleBlockDate}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                    >
                        <ShieldBan size={18}/> Bloquear Día
                    </button>
                </div>
            </div>

            {/* Lista de Días Bloqueados */}
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                <h2 className="text-xl font-bold text-white mb-6">Próximos Días Libres</h2>
                
                {blockedDates.length === 0 ? (
                    <div className="text-center text-zinc-600 py-10">
                        <p>No hay vacaciones programadas.</p>
                        <p className="text-sm mt-1">¡A trabajar! 💪</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {blockedDates.map(block => (
                            <div key={block.id} className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800 group hover:border-zinc-700 transition">
                                <div className="flex items-center gap-4">
                                    <div className="bg-zinc-900 text-zinc-400 font-bold p-2 rounded-lg text-center min-w-[50px]">
                                        <div className="text-xs uppercase">{new Date(block.date).toLocaleString('es-ES', {month: 'short', timeZone: 'UTC'})}</div>
                                        <div className="text-xl">{new Date(block.date).getUTCDate()}</div>
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">{block.reason}</div>
                                        <div className="text-xs text-zinc-500">No disponible</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUnblock(block.id)}
                                    className="p-2 text-zinc-600 hover:text-green-500 transition opacity-0 group-hover:opacity-100"
                                    title="Desbloquear (Volver a trabajar)"
                                >
                                    <Plus size={20} className="rotate-45"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;