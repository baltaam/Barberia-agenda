import React, { useState, useEffect } from 'react';
import { User, CheckCircle, Calendar, MessageCircle, Clock, MapPin, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

// --- CONFIGURACIÓN VERCEL / RENDER ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- TIPOS ---
interface Service { id: string; name: string; durationMin: number; price: number; }
interface Professional { id: string; name: string; jobTitle?: string; }
interface Tenant {
  id: string;
  name: string;
  slug: string;
  themeColor: string;
  category: string;
  address: string;
  phone: string;
}

const PROF_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
];

// Imagen por defecto (se podría agregar a la BD después)
const DEFAULT_BG = "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=1000&auto=format&fit=crop";

function App() {
  // Obtenemos el slug de la URL (ej: /barberia-demo). 
  // Si no hay, usamos 'barberia-demo' por defecto para que puedas probar en localhost:5173
  const { slug } = useParams<{ slug: string }>();
  const activeSlug = slug || 'barberia-demo';

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const [step, setStep] = useState(1);
  
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState(''); 
  const [recurringWeeks, setRecurringWeeks] = useState(1);

  // --- 1. CARGA INICIAL (CAMALEÓNICA) ---
  useEffect(() => {
    const fetchTenantAndData = async () => {
      try {
        // 1. Buscamos la identidad del negocio según la URL
        const tenantRes = await axios.get(`${API_URL}/api/tenant/${activeSlug}`);
        const currentTenant = tenantRes.data;
        setTenant(currentTenant);
        document.title = `${currentTenant.name} | Reservas`;

        // 2. Buscamos SOLO los profesionales y servicios de este negocio
        const [prosRes, servRes] = await Promise.all([
          axios.get(`${API_URL}/professionals`, { params: { tenantId: currentTenant.id } }),
          axios.get(`${API_URL}/services`, { params: { tenantId: currentTenant.id } })
        ]);
        
        setProfessionals(prosRes.data);
        setServices(servRes.data);
      } catch (err) {
        console.error("Error conectando con el backend:", err);
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setTenantNotFound(true);
        } else {
          toast.error("No se pudo conectar con el servidor");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenantAndData();
  }, [activeSlug]);

  // --- 2. BUSCAR HORARIOS ---
  const fetchAvailability = async (dateStr: string, professionalId: string, serviceId: string) => {
    setLoadingSlots(true);
    setAvailableSlots([]); 
    
    try {
      const res = await axios.get(`${API_URL}/api/availability`, {
        params: { professionalId, date: dateStr, serviceId }
      });
      setAvailableSlots(res.data);
    } catch (err) { 
        console.error("Error buscando horarios:", err); 
        toast.error("Error al cargar disponibilidad");
    } finally { 
        setLoadingSlots(false); 
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const today = new Date().toISOString().split('T')[0];
    
    if (newDate < today) { 
      toast.error("Por favor selecciona una fecha futura.");
      return; 
    }
    
    setSelectedDate(newDate);
    setSelectedTime(''); 
    
    if (newDate && selectedProfessional && selectedService) {
      fetchAvailability(newDate, selectedProfessional.id, selectedService.id);
    }
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedProfessional || !tenant) return;
    try {
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        customerName: clientName,
        customerEmail: clientEmail,
        customerPhone: clientPhone,
        date: startDateTime.toISOString(),
        recurringWeeks: recurringWeeks
      });
      
      setStep(5); 
      toast.success("¡Reserva creada con éxito!");
    } catch (error) { 
      console.error(error);
      toast.error("Error al reservar. Verifica los datos."); 
    }
  };

  const openWhatsApp = () => {
    if (!selectedService || !selectedProfessional || !tenant) return;
    const message = `Hola! 👋 Reservé un turno para *${selectedService.name}* con ${selectedProfessional.name}. \n📅 Fecha: ${selectedDate} \n⏰ Hora: ${selectedTime} \n👤 Cliente: ${clientName}`;
    window.open(`https://wa.me/${tenant.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getDynamicStyle = () => ({
    '--dynamic-color': tenant?.themeColor || '#ffffff'
  } as React.CSSProperties);

  // --- RENDERIZADO ---

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center animate-pulse">Cargando experiencia...</div>;
  
  if (tenantNotFound || !tenant) return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <MapPin size={60} className="text-zinc-600 mb-4"/>
        <h1 className="text-2xl font-bold mb-2">Negocio no encontrado</h1>
        <p className="text-zinc-500">Asegúrate de haber escrito bien el enlace de la página.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100">
      
      <div className="bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden relative">
        
        {/* Header Dinámico */}
        <div className="relative h-48">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900 z-10"></div>
            <img 
              src={DEFAULT_BG} 
              className="w-full h-full object-cover opacity-60"
              alt="Background"
            />
            <div className="absolute bottom-4 left-6 z-20">
                <div 
                  className="text-zinc-900 text-xs font-bold px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider"
                  style={{ backgroundColor: tenant.themeColor }}
                >
                  {tenant.category}
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{tenant.name}</h1>
                <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                    <MapPin size={14} /> <span>{tenant.address}</span>
                    <span className="text-zinc-600">|</span>
                    <Star size={14} style={{ fill: tenant.themeColor, color: tenant.themeColor }}/> <span>5.0</span>
                </div>
            </div>
        </div>

        <div className="p-6">
          
          {/* PASO 1: Servicios */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-medium text-zinc-400 mb-4">Nuestros Servicios</h2>
              {services.length === 0 && <p className="text-zinc-500 text-center">No hay servicios disponibles.</p>}
              
              <div className="grid grid-cols-1 gap-3">
                {services.map(srv => (
                  <button 
                    key={srv.id} 
                    onClick={() => { setSelectedService(srv); setStep(2); }} 
                    className="group relative overflow-hidden rounded-2xl border border-zinc-800 hover:border-opacity-50 transition-all duration-300 flex items-center p-3 gap-4 bg-zinc-800/50 hover:bg-zinc-800"
                    style={{ borderColor: 'transparent' }} 
                  >
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[color:var(--dynamic-color)] pointer-events-none rounded-2xl transition-colors" style={getDynamicStyle()}></div>

                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-zinc-900 font-bold text-lg shrink-0" style={{ backgroundColor: tenant.themeColor }}>
                       {srv.name.charAt(0)}
                    </div>
                      
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg text-white">{srv.name}</div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Clock size={12}/> {srv.durationMin} min
                      </div>
                    </div>
                      
                    <div className="font-bold text-lg mr-2" style={{ color: tenant.themeColor }}>${srv.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: Profesionales */}
          {step === 2 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
             <button onClick={() => setStep(1)} className="text-sm text-zinc-500 hover:text-white flex items-center gap-1">← Cambiar servicio</button>
             
             <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Selecciona Profesional</h2>
                <p className="text-zinc-500 text-sm">¿Quién quieres que te atienda?</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
             {professionals.map((prof, idx) => (
               <button 
                 key={prof.id} 
                 onClick={() => { 
                   setSelectedProfessional(prof); 
                   setSelectedDate(''); 
                   setAvailableSlots([]); 
                   setStep(3); 
                 }} 
                 className="flex flex-col items-center gap-3 p-4 border border-zinc-800 rounded-2xl bg-zinc-800/30 hover:bg-zinc-800 transition-all group relative"
               >
                 <div className="absolute inset-0 border border-transparent group-hover:border-[color:var(--dynamic-color)] rounded-2xl transition" style={getDynamicStyle()}></div>

                 <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-[color:var(--dynamic-color)] transition" style={getDynamicStyle()}>
                   <img src={PROF_AVATARS[idx % PROF_AVATARS.length]} className="w-full h-full object-cover" alt={prof.name}/>
                 </div>
                 <div className="text-center">
                    <div className="font-bold text-white">{prof.name}</div>
                    <div className="text-xs font-medium" style={{ color: tenant.themeColor }}>
                        {prof.jobTitle || 'Profesional'}
                    </div>
                 </div>
               </button>
             ))}
             </div>
           </div>
          )}

          {/* PASO 3: Fecha y Hora */}
          {step === 3 && (
             <div className="space-y-6 animate-in zoom-in-95 duration-300">
               <button onClick={() => setStep(2)} className="text-sm text-zinc-500 hover:text-white">← Volver</button>
               
               <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700">
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Selecciona Fecha</label>
                 <div className="flex items-center bg-zinc-900 p-3 rounded-lg border border-zinc-700 transition">
                    <Calendar size={18} className="mr-3" style={{ color: tenant.themeColor }}/>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      min={new Date().toISOString().split('T')[0]} 
                      className="bg-transparent w-full outline-none text-white"
                      style={{colorScheme: 'dark'}}
                      onChange={handleDateChange} 
                    />
                 </div>
               </div>

               {selectedDate && (
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-zinc-300">
                        {loadingSlots ? 'Buscando horarios...' : 'Horarios Disponibles'}
                      </label>
                      {loadingSlots && <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: tenant.themeColor }}></div>}
                   </div>
                   
                   {!loadingSlots && (
                     <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                       {availableSlots.map(time => (
                         <button 
                           key={time} 
                           onClick={() => setSelectedTime(time)} 
                           className={`py-2 px-1 rounded-lg text-sm font-medium transition-all border ${
                             selectedTime === time 
                               ? 'text-zinc-900 shadow-lg scale-105' 
                               : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-transparent'
                           }`}
                           style={selectedTime === time ? { backgroundColor: tenant.themeColor, borderColor: tenant.themeColor } : {}}
                         >
                           {time}
                         </button>
                       ))}
                       {availableSlots.length === 0 && <p className="col-span-4 text-center text-sm text-zinc-500">No hay turnos o el local está cerrado.</p>}
                     </div>
                   )}
                 </div>
               )}
               
               <button 
                 disabled={!selectedDate || !selectedTime} 
                 onClick={() => setStep(4)} 
                 className="w-full text-zinc-900 py-4 rounded-xl font-bold mt-4 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg"
                 style={{ backgroundColor: !selectedDate || !selectedTime ? '#555' : tenant.themeColor }}
               >
                 Confirmar Horario
               </button>
             </div>
          )}

          {/* PASO 4: Datos Cliente */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => setStep(3)} className="text-sm text-zinc-500 hover:text-white">← Volver</button>
              
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white">Completa tus datos</h2>
              </div>
              
              <div className="space-y-3">
                <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex items-center gap-3">
                    <User className="text-zinc-500" size={20}/>
                    <input placeholder="Nombre Completo" className="bg-transparent w-full outline-none text-white" onChange={e => setClientName(e.target.value)}/>
                </div>
                <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex items-center gap-3">
                    <div className="text-zinc-500 font-bold">@</div>
                    <input placeholder="Email (Obligatorio)" className="bg-transparent w-full outline-none text-white" onChange={e => setClientEmail(e.target.value)}/>
                </div>
                <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex items-center gap-3">
                    <MessageCircle className="text-zinc-500" size={20}/>
                    <input placeholder="Teléfono" type="tel" className="bg-transparent w-full outline-none text-white" onChange={e => setClientPhone(e.target.value)}/>
                </div>
              </div>
              <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 mt-4">
             <label className="block text-sm font-bold text-zinc-300 mb-2">
               ¿Querés repetir este turno? (Modo Abono)
             </label>
             <select 
               value={recurringWeeks}
               onChange={(e) => setRecurringWeeks(Number(e.target.value))}
               className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-3 outline-none focus:border-[color:var(--dynamic-color)] transition-colors"
               style={getDynamicStyle()}
             >
               <option value={1}>No, solo por esta vez</option>
               <option value={2}>Sí, 2 semanas seguidas</option>
               <option value={4}>Sí, 1 mes completo (4 semanas)</option>
               <option value={8}>Sí, 2 meses (8 semanas)</option>
             </select>
             <p className="text-xs text-zinc-500 mt-2">
               Bloquearemos este mismo día y horario para vos de forma automática.
             </p>
           </div>
              
              <button 
                onClick={handleBooking}
                disabled={!clientName || !clientEmail || !clientPhone}
                className="w-full text-zinc-900 py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                style={{ backgroundColor: tenant.themeColor }}
              >
                Confirmar Reserva
              </button>
            </div>
          )}

          {/* PASO 5: Éxito */}
          {step === 5 && (
            <div className="text-center py-10 animate-in zoom-in duration-500">
              <div className="inline-block p-4 rounded-full bg-green-500/20 mb-6">
                <CheckCircle size={80} className="text-green-500 animate-bounce"/>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">¡Turno Confirmado!</h2>
              <p className="text-zinc-400 mb-8 max-w-xs mx-auto">
                Te esperamos el {selectedDate} a las {selectedTime}
              </p>
              
              <button 
                onClick={openWhatsApp}
                className="bg-[#25D366] text-white w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-[#1ebd59] transition"
              >
                <MessageCircle size={24} />
                Ver comprobante
              </button>

              <button onClick={() => window.location.reload()} className="mt-8 block w-full text-zinc-500 hover:text-white underline text-sm transition">
                Nueva reserva
              </button>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-zinc-800 text-center">
            <Link to="/login" className="text-xs text-zinc-600 hover:text-white font-medium transition-colors tracking-widest uppercase">
              Admin Access
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;