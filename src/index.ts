import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { addMinutes, addWeeks, format, isBefore, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import cron from 'node-cron';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- ENDPOINT DE BIENVENIDA ---
app.get('/', (req, res) => {
  res.send('✅ Backend Multi-Rubro SaaS funcionando en Vercel/Render. Rutas activas: /professionals, /services, /appointments, /api/tenant');
});

// --- 0. OBTENER IDENTIDAD DEL NEGOCIO ---
app.get('/api/tenant/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { slug: String(slug) }
    });
    
    if (!tenant) return res.status(404).json({ error: 'Negocio no encontrado' });
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar el negocio' });
  }
});

// --- 1. OBTENER PROFESIONALES ---
app.get('/professionals', async (req, res) => {
  try {
    const { tenantId } = req.query; 
    const whereClause = tenantId ? { tenantId: String(tenantId) } : {};
    
    const professionals = await prisma.professional.findMany({
      where: whereClause
    });
    res.json(professionals);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar profesionales' });
  }
});

// --- 2. OBTENER SERVICIOS ---
app.get('/services', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const whereClause = tenantId ? { tenantId: String(tenantId) } : {};

    const services = await prisma.service.findMany({
      where: whereClause
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar servicios' });
  }
});

// --- 3. CREAR RESERVA (AHORA CON TURNOS RECURRENTES) ---
app.post('/appointments', async (req, res) => {
  try {
    // 🔥 Agregamos 'recurringWeeks' (si no nos mandan nada, por defecto es 1 sola vez)
    const { professionalId, serviceId, date, customerName, customerPhone, customerEmail, recurringWeeks = 1 } = req.body;

    if (!professionalId || !serviceId || !date || !customerName || !customerEmail) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (incluyendo email)' });
    }

    const service = await prisma.service.findUnique({ where: { id: String(serviceId) } });
    if (!service) return res.status(400).json({ error: "Servicio no encontrado" });

    let customer = await prisma.customer.findFirst({
      where: { email: String(customerEmail), tenantId: service.tenantId }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: String(customerName),
          email: String(customerEmail),
          phone: customerPhone ? String(customerPhone) : null,
          tenantId: service.tenantId 
        }
      });
    }

    // 🔥 LA MAGIA DE LA REPETICIÓN 🔥
    // Preparamos una lista de turnos a crear
    const appointmentsToCreate = [];
    const firstDate = new Date(date);

    for (let i = 0; i < recurringWeeks; i++) {
      const start = addWeeks(firstDate, i); // Suma 'i' semanas a la fecha original
      const end = addMinutes(start, service.durationMin);

      appointmentsToCreate.push({
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
        professionalId: String(professionalId),
        serviceId: String(serviceId),
        customerId: customer.id
      });
    }

    // createMany guarda toda la lista en la base de datos de un solo golpe
    const createdAppointments = await prisma.appointment.createMany({
      data: appointmentsToCreate
    });

    res.json({ success: true, count: createdAppointments.count });

  } catch (error) {
    console.error("Error creando reserva:", error);
    res.status(500).json({ error: "No se pudo crear el turno" });
  }
});
// --- OBTENER TURNOS PARA EL ADMIN (MULTI-TENANT) ---
app.get('/appointments', async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: "Falta el ID del negocio" });
    }

    // Buscamos TODOS los turnos, pero SOLO de los profesionales que pertenecen a este negocio
    const appointments = await prisma.appointment.findMany({
      where: {
        professional: {
          tenantId: String(tenantId)
        }
      },
      include: {
        customer: true,      // Traemos los datos del cliente para ver el nombre y teléfono
        service: true,       // Traemos qué servicio se va a hacer
        professional: true   // Traemos con quién es el turno
      },
      orderBy: {
        startTime: 'asc'     // Los ordenamos por fecha y hora
      }
    });

    res.json(appointments);

  } catch (error) {
    console.error("Error al buscar turnos:", error);
    res.status(500).json({ error: "Error al buscar turnos del panel" });
  }
});
// --- ELIMINAR UN TURNO (ADMIN) ---
app.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params; // Agarramos el ID del turno que mandó el Frontend

    // Le decimos a Prisma que lo borre de PostgreSQL
    await prisma.appointment.delete({
      where: {
        id: String(id)
      }
    });

    res.json({ success: true, message: "Turno eliminado" });
  } catch (error) {
    console.error("Error al eliminar el turno:", error);
    res.status(500).json({ error: "No se pudo eliminar el turno" });
  }
});

// --- 4. DISPONIBILIDAD (¡Ahora sí usa la Base de Datos al 100%!) ---
app.get('/api/availability', async (req, res) => {
  const { professionalId, date, serviceId } = req.query;

  if (!professionalId || !date || !serviceId) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const searchDate = parseISO(String(date));
    
    // Traemos el servicio y TODA la info de configuración de su negocio
    const service = await prisma.service.findUnique({ 
        where: { id: String(serviceId) },
        include: { tenant: true } 
    });
    if (!service) return res.status(400).json({ error: "Servicio no existe" });

    const tenant = service.tenant;

    // Regla 1: Días Cerrados Dinámicos (Ya no hay ts-ignore)
    const closedDays = JSON.parse(tenant.closedDays);
    const dayOfWeek = searchDate.getDay();
    if (closedDays.includes(dayOfWeek)) return res.json([]); 

    // Regla 2: Vacaciones y bloqueos
    const blocked = await prisma.blockedDate.findFirst({
      where: {
        professionalId: String(professionalId),
        date: {
          gte: startOfDay(searchDate),
          lte: endOfDay(searchDate)
        }
      }
    });
    if (blocked) return res.json([]);

    // Regla 3: Turnos ya ocupados
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: String(professionalId),
        startTime: {
          gte: startOfDay(searchDate),
          lte: endOfDay(searchDate)
        }
      }
    });

    const slots = [];
    
    // Regla 4: Horarios Dinámicos desde la DB (Ya no hay ts-ignore)
    let currentTime = new Date(searchDate);
    currentTime.setHours(tenant.openingHour, 0, 0, 0); 
    
    const endTime = new Date(searchDate);
    endTime.setHours(tenant.closingHour, 0, 0, 0);   

    while (isBefore(currentTime, endTime)) {
      const slotEnd = addMinutes(currentTime, service.durationMin);
      if (isBefore(endTime, slotEnd)) break;

      const isTaken = appointments.some(appt => {
        const apptStart = new Date(appt.startTime);
        const apptEnd = new Date(appt.endTime);
        return (
          (currentTime >= apptStart && currentTime < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (currentTime <= apptStart && slotEnd >= apptEnd)
        );
      });

      if (!isTaken) slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, 30);
    }
    
    res.json(slots);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error calculando horarios" });
  }
});

// --- 5. OBTENER Y CREAR BLOQUEOS (VACACIONES) ---
app.get('/api/blocks', async (req, res) => {
  try {
    const { professionalId } = req.query;
    if (!professionalId) return res.json([]);
    const blocks = await prisma.blockedDate.findMany({
      where: { professionalId: String(professionalId) },
      orderBy: { date: 'asc' }
    });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar bloqueos' });
  }
});

app.post('/api/blocks', async (req, res) => {
  try {
    const { professionalId, date, reason } = req.body;
    const block = await prisma.blockedDate.create({
      data: {
        professionalId: String(professionalId),
        date: new Date(date),
        reason: String(reason)
      }
    });
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear bloqueo' });
  }
});

app.delete('/api/blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.blockedDate.delete({ where: { id: String(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
});
// --- 6. ROBOT DE RECORDATORIOS (CRON JOB) 🤖 ---
// Este código se ejecuta todos los días a las 10:00 AM (0 10 * * *)
cron.schedule('* * * * *', async () => {
  console.log("⏰ [CRON] Despertando robot de recordatorios...");

  try {
    // 1. Calculamos qué día es "mañana"
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const startOfTomorrow = startOfDay(tomorrow);
    const endOfTomorrow = endOfDay(tomorrow);

    // 2. Buscamos todos los turnos confirmados para mañana, trayendo datos del cliente, servicio y profesional
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: startOfTomorrow,
          lte: endOfTomorrow
        },
        status: 'CONFIRMED'
      },
      include: {
        customer: true,
        service: { include: { tenant: true } },
        professional: true
      }
    });

    if (upcomingAppointments.length === 0) {
      console.log("📭 [CRON] No hay turnos para mañana. Vuelvo a dormir.");
      return;
    }

    console.log(`🚀 [CRON] Encontré ${upcomingAppointments.length} turnos para mañana. Preparando mensajes...`);

    // 3. Preparamos y "enviamos" el mensaje para cada uno
    for (const appt of upcomingAppointments) {
      const timeFormated = format(new Date(appt.startTime), 'HH:mm');
      const dateFormated = format(new Date(appt.startTime), 'dd/MM/yyyy');
      
      const mensaje = `
👋 Hola ${appt.customer.name}! 
Te escribimos de *${appt.service.tenant.name}*.

⏰ Te recordamos que tenés un turno mañana ${dateFormated} a las ${timeFormated} hs.
💇‍♂️ Servicio: ${appt.service.name} con ${appt.professional.name}.
📍 Dirección: ${appt.service.tenant.address}

Por favor, si no podés asistir avisanos con anticipación. ¡Te esperamos!
      `;

      // ACÁ ES DONDE IRÍA LA API DE WHATSAPP REAL. Por ahora lo simulamos:
      console.log(`\n========================================`);
      console.log(`📲 ENVIANDO WHATSAPP A: ${appt.customer.phone || appt.customer.email}`);
      console.log(mensaje);
      console.log(`========================================\n`);
    }

  } catch (error) {
    console.error("❌ Error en el robot de recordatorios:", error);
  }
});

// (Opcional) Ruta secreta para probar el robot sin esperar a las 10 AM
app.get('/api/test-cron', async (req, res) => {
  console.log("Prueba manual del robot iniciada...");
  // Aquí podríamos meter la misma lógica de arriba, pero por ahora solo avisamos
  res.send("¡El robot está instalado y esperando a las 10:00 AM de mañana!");
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor SaaS listo en http://localhost:${PORT}`);
});