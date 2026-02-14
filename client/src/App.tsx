import { useState, useEffect } from 'react';
import { User, CheckCircle, Calendar, MessageCircle, Clock, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

// --- TIPOS ---
interface Service { id: string; name: string; durationMin: number; price: string; }
interface Professional { id: string; name: string; }
interface Tenant { id: string; name: string; themeColor: string; services: Service[]; professionals: Professional[]; }

// --- IMÁGENES DE PRUEBA (Para darle vida visual sin base de datos aún) ---
const SERVICE_IMAGES: Record<string, string> = {
  "Corte Clásico": "https://images.unsplash.com/photo-1599351431202-6e0000a40000?w=500&auto=format&fit=crop&q=60",
  "Barba": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&auto=format&fit=crop&q=60",
  "Corte + Barba": "https://images.unsplash.com/photo-1503951914875-befca74f45a5?w=500&auto=format&fit=crop&q=60",
  "Coloración": "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?w=500&auto=format&fit=crop&q=60",
  "default": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&auto=format&fit=crop&q=60"
};

const PROF_AVATARS: string[] = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60", // Hombre 1
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60", // Hombre 2
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=60", // Mujer 1
];

function App() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState(''); 

  // --- LÓGICA ---
  useEffect(() => {
    axios.get('https://barberia-agenda.onrender.com')
      .then(res => { setTenant(res.data); setLoading(false); })
      .catch(err => console.error(err));
  }, []);

  const fetchAvailability = async (dateStr: string, professionalId: string, serviceId: string) => {
    setLoadingSlots(true);
    setAvailableSlots([]); 
    try {
      const res = await axios.get('https://barberia-agenda.onrender.com', {
        params: { professionalId: professionalId, date: dateStr, serviceId: serviceId }
      });
      setAvailableSlots(res.data);
    } catch (err) { console.error(err); } finally { setLoadingSlots(false); }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const today = new Date().toISOString().split('T')[0];
if (newDate < today) { 
  toast.error("¡Viajar en el tiempo aún no es posible! 😅 Selecciona una fecha futura.");
  setSelectedDate(''); 
  return; 
}
    setSelectedDate(newDate);
    setSelectedTime(''); 
    if (newDate && selectedProfessional && selectedService) {
      fetchAvailability(newDate, selectedProfessional.id, selectedService.id);
    }
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedProfessional) return;
    try {
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      await axios.post('http://localhost:3001/api/appointments', {
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        customerName: clientName,
        customerEmail: clientEmail,
        customerPhone: clientPhone,
        startTime: startDateTime.toISOString()
      });
      setStep(5); 
    } catch { toast.error("¡Ups! Alguien te ganó el turno por segundos. Intenta otro horario."); }
  };

  const openWhatsApp = () => {
    if (!selectedService || !selectedProfessional) return;
    const businessPhone = "5491122334455"; 
    const message = `Hola! 💈 Acabo de reservar turno para *${selectedService.name}* con ${selectedProfessional.name}. \n📅 Fecha: ${selectedDate} \n⏰ Hora: ${selectedTime} \n👤 Cliente: ${clientName}`;
    window.open(`https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- HELPERS VISUALES ---
  const getServiceImage = (name: string) => {
    // Busca si alguna palabra clave coincide (ej: "Corte" en "Corte Clásico")
    const key = Object.keys(SERVICE_IMAGES).find(k => name.includes(k));
    return SERVICE_IMAGES[key || "default"];
  };

  // --- RENDERIZADO (DISEÑO PREMIUM) ---

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center animate-pulse">Cargando experiencia...</div>;
  if (!tenant) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-red-500">Error de carga</div>;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100">
      
      {/* TARJETA PRINCIPAL TIPO CRISTAL (Glassmorphism) */}
      <div className="bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden relative">
        
        {/* Header con Imagen de Fondo y Gradiente */}
        <div className="relative h-48">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900 z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1503951914875-befca74f45a5?q=80&w=1000&auto=format&fit=crop" 
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute bottom-4 left-6 z-20">
                <div className="bg-amber-500 text-zinc-900 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">PREMIUM BARBER</div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{tenant.name}</h1>
                <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                    <MapPin size={14} /> <span>Calchaqui, Santa Fe</span>
                    <span className="text-zinc-600">|</span>
                    <Star size={14} className="text-amber-500 fill-amber-500"/> <span>4.9 (1.2k)</span>
                </div>
            </div>
        </div>

        <div className="p-6">
          
          {/* PASO 1: Servicios (Estilo Tarjetas Visuales) */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-medium text-zinc-400 mb-4">Selecciona tu Experiencia</h2>
              <div className="grid grid-cols-1 gap-3">
                {tenant.services.map(srv => (
                  <button 
                    key={srv.id} 
                    onClick={() => { setSelectedService(srv); setStep(2); }} 
                    className="group relative overflow-hidden rounded-2xl border border-zinc-800 hover:border-amber-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center p-3 gap-4 bg-zinc-800/50 hover:bg-zinc-800 transition">
                      {/* Imagen Miniatura */}
                      <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0">
                        <img src={getServiceImage(srv.name)} className="h-full w-full object-cover group-hover:scale-110 transition duration-500"/>
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="font-bold text-lg text-white group-hover:text-amber-400 transition">{srv.name}</div>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <Clock size={12}/> {srv.durationMin} min
                        </div>
                      </div>
                      
                      <div className="font-bold text-amber-500 text-lg mr-2">${srv.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: Profesionales (Estilo Avatares) */}
          {step === 2 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
             <button onClick={() => setStep(1)} className="text-sm text-zinc-500 hover:text-white flex items-center gap-1">← Cambiar servicio</button>
             
             <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">¿Quién te atiende hoy?</h2>
                <p className="text-zinc-500 text-sm">Elige a tu especialista de confianza</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
             {tenant.professionals.map((prof, idx) => (
               <button 
                 key={prof.id} 
                 onClick={() => { 
                   setSelectedProfessional(prof); 
                   setSelectedDate(''); 
                   setAvailableSlots([]); 
                   setStep(3); 
                 }} 
                 className="flex flex-col items-center gap-3 p-4 border border-zinc-800 rounded-2xl bg-zinc-800/30 hover:bg-zinc-800 hover:border-amber-500/30 transition-all group"
               >
                 <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-amber-500 transition">
                   <img src={PROF_AVATARS[idx % PROF_AVATARS.length]} className="w-full h-full object-cover"/>
                 </div>
                 <div className="text-center">
                    <div className="font-bold text-white">{prof.name}</div>
                    <div className="text-xs text-amber-500 font-medium">Master Barber</div>
                 </div>
               </button>
             ))}
             </div>
           </div>
          )}

          {/* PASO 3: Fecha y Hora (Dark Calendar) */}
          {step === 3 && (
             <div className="space-y-6 animate-in zoom-in-95 duration-300">
               <button onClick={() => setStep(2)} className="text-sm text-zinc-500 hover:text-white">← Volver</button>
               
               <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700">
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Selecciona Fecha</label>
                 <div className="flex items-center bg-zinc-900 p-3 rounded-lg border border-zinc-700 focus-within:border-amber-500 transition">
                    <Calendar size={18} className="mr-3 text-amber-500"/>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      min={new Date().toISOString().split('T')[0]} 
                      className="bg-transparent w-full outline-none text-white color-scheme-dark" // CSS nativo para modo oscuro
                      style={{colorScheme: 'dark'}}
                      onChange={handleDateChange} 
                    />
                 </div>
               </div>

               {selectedDate && (
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-zinc-300">
                        {loadingSlots ? 'Buscando...' : 'Horarios Disponibles'}
                      </label>
                      {loadingSlots && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>}
                   </div>
                   
                   {!loadingSlots && availableSlots.length === 0 ? (
                      <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-sm rounded-xl text-center">
                        Lo sentimos, no quedan turnos. 😔
                      </div>
                   ) : (
                     <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                       {availableSlots.map(time => (
                         <button 
                           key={time} 
                           onClick={() => setSelectedTime(time)} 
                           className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                             selectedTime === time 
                               ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' 
                               : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-transparent hover:border-zinc-600'
                           }`}
                         >
                           {time}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               )}
               
               <button 
                 disabled={!selectedDate || !selectedTime} 
                 onClick={() => setStep(4)} 
                 className="w-full bg-white text-black py-4 rounded-xl font-bold mt-4 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-400 transition shadow-lg"
               >
                 Confirmar Horario
               </button>
             </div>
          )}

          {/* PASO 4: Datos Cliente (Minimalista Dark) */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => setStep(3)} className="text-sm text-zinc-500 hover:text-white">← Volver</button>
              
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white">Casi listo</h2>
                <p className="text-zinc-500">Completa tus datos para finalizar</p>
              </div>
              
              <div className="space-y-3">
                <div className="group bg-zinc-800 p-3 rounded-xl border border-zinc-700 focus-within:border-amber-500 transition flex items-center gap-3">
                    <User className="text-zinc-500 group-focus-within:text-amber-500" size={20}/>
                    <input 
                        placeholder="Nombre Completo" 
                        className="bg-transparent w-full outline-none text-white placeholder-zinc-500"
                        onChange={e => setClientName(e.target.value)}
                    />
                </div>
                
                <div className="group bg-zinc-800 p-3 rounded-xl border border-zinc-700 focus-within:border-amber-500 transition flex items-center gap-3">
                    <div className="text-zinc-500 group-focus-within:text-amber-500 font-bold">@</div>
                    <input 
                        placeholder="Email" 
                        className="bg-transparent w-full outline-none text-white placeholder-zinc-500"
                        onChange={e => setClientEmail(e.target.value)}
                    />
                </div>

                <div className="group bg-zinc-800 p-3 rounded-xl border border-zinc-700 focus-within:border-amber-500 transition flex items-center gap-3">
                    <MessageCircle className="text-zinc-500 group-focus-within:text-amber-500" size={20}/>
                    <input 
                        placeholder="WhatsApp (ej: 1122334455)" 
                        type="tel"
                        className="bg-transparent w-full outline-none text-white placeholder-zinc-500"
                        onChange={e => setClientPhone(e.target.value)}
                    />
                </div>
              </div>
              
              <button 
                onClick={handleBooking}
                disabled={!clientName || !clientEmail || !clientPhone}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
              >
                Confirmar Reserva
              </button>
            </div>
          )}

          {/* PASO 5: Éxito (Celebración) */}
          {step === 5 && (
            <div className="text-center py-10 animate-in zoom-in duration-500">
              <div className="inline-block p-4 rounded-full bg-green-500/20 mb-6">
                <CheckCircle size={80} className="text-green-500 animate-bounce"/>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">¡Turno Reservado!</h2>
              <p className="text-zinc-400 mb-8 max-w-xs mx-auto">
                Te esperamos el <span className="text-white font-bold">{selectedDate}</span> a las <span className="text-white font-bold">{selectedTime}</span>
              </p>
              
              <button 
                onClick={openWhatsApp}
                className="bg-[#25D366] text-white w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-[#1ebd59] transition shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:scale-105"
              >
                <MessageCircle size={24} />
                Recibir Comprobante
              </button>

              <button onClick={() => window.location.reload()} className="mt-8 block w-full text-zinc-500 hover:text-white underline text-sm transition">
                Hacer otra reserva
              </button>
            </div>
          )}

          {/* Footer del Dueño (Discreto y elegante) */}
          <div className="mt-10 pt-6 border-t border-zinc-800 text-center">
            <Link to="/login" className="text-xs text-zinc-600 hover:text-amber-500 font-medium transition-colors tracking-widest uppercase">
              Admin Access
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;