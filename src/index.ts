import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { addMinutes, format, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN: DÍAS QUE LA BARBERÍA CIERRA SIEMPRE ---
// 0 = Domingo, 1 = Lunes, 2 = Martes, ... 6 = Sábado
const NON_WORKING_DAYS = [0, 1]; // Aquí cerramos Domingos y Lunes

// --- ENDPOINTS ---

// 1. Obtener Info del Negocio
app.get('/api/tenant/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: { services: true, professionals: true }
    });
    if (!tenant) return res.status(404).json({ error: "Negocio no encontrado" });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: "Error interno" });
  }
});

// 2. Calcular Disponibilidad (Lógica Maestra 🧠)
app.get('/api/availability', async (req, res) => {
  const { professionalId, date, serviceId } = req.query;

  if (!professionalId || !date || !serviceId) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const searchDate = parseISO(String(date));

    // A) REGLA 1: Días Fijos (Domingos/Lunes)
    const dayOfWeek = searchDate.getDay();
    if (NON_WORKING_DAYS.includes(dayOfWeek)) {
      return res.json([]); // Devuelve lista vacía (Cerrado)
    }

    // B) REGLA 2: Días Bloqueados por el Admin (Vacaciones)
    const blocked = await prisma.blockedDate.findFirst({
      where: {
        professionalId: String(professionalId),
        date: {
          gte: startOfDay(searchDate),
          lte: endOfDay(searchDate)
        }
      }
    });

    if (blocked) {
      return res.json([]); // Devuelve lista vacía (Está de vacaciones)
    }

    // C) REGLA 3: Calcular huecos libres vs Turnos ocupados
    const service = await prisma.service.findUnique({ where: { id: String(serviceId) } });
    if (!service) return res.status(400).json({ error: "Servicio no existe" });
    
    const duration = service.durationMin;
    
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: String(professionalId),
        startTime: {
          gte: startOfDay(searchDate),
          lte: endOfDay(searchDate)
        }
      }
    });

    // Horario Laboral (Hardcoded por ahora: 9:00 a 18:00)
    const workStartHour = 9;
    const workEndHour = 18;
    const slots = [];
    
    let currentTime = new Date(searchDate);
    currentTime.setHours(workStartHour, 0, 0, 0);
    const endTime = new Date(searchDate);
    endTime.setHours(workEndHour, 0, 0, 0);

    while (isBefore(currentTime, endTime)) {
      const slotEnd = addMinutes(currentTime, duration);
      if (isBefore(endTime, slotEnd)) break;

      // Verificamos si choca con algún turno existente
      const isTaken = appointments.some(appt => {
        const apptStart = new Date(appt.startTime);
        const apptEnd = new Date(appt.endTime);
        return (
          (currentTime >= apptStart && currentTime < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (currentTime <= apptStart && slotEnd >= apptEnd)
        );
      });

      if (!isTaken) {
        slots.push(format(currentTime, 'HH:mm'));
      }
      currentTime = addMinutes(currentTime, 30); // Intervalos de 30 min
    }
    res.json(slots);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error calculando horarios" });
  }
});

// 3. Ver Turnos (Dashboard Admin)
app.get('/api/appointments', async (req, res) => {
  const { professionalId, date } = req.query;
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: String(professionalId),
        startTime: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`)
        }
      },
      include: { service: true, customer: true },
      orderBy: { startTime: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar turnos" });
  }
});

// 4. Crear Reserva (Cliente)
app.post('/api/appointments', async (req, res) => {
  const { professionalId, serviceId, customerName, customerEmail, customerPhone, startTime } = req.body;

  try {
    const start = new Date(startTime);
    // Validación básica de pasado
    if (start < new Date()) {
       return res.status(400).json({ error: "No se pueden crear turnos en el pasado." });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(400).json({ error: "Servicio inválido" });

    const end = addMinutes(start, service.durationMin);
    const tenantId = service.tenantId;

    const appointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        professional: { connect: { id: professionalId } },
        service: { connect: { id: serviceId } },
        customer: {
          connectOrCreate: {
            where: { email_tenantId: { email: customerEmail, tenantId } },
            create: { 
              name: customerName, 
              email: customerEmail, 
              tenantId, 
              phone: customerPhone || "" // Guardamos teléfono
            }
          }
        }
      }
    });
    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo crear el turno" });
  }
});

// 5. Borrar Turno (Admin)
app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.appointment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo borrar el turno" });
  }
});

// --- NUEVOS ENDPOINTS PARA GESTIÓN DE BLOQUEOS (VACACIONES) ---

// 6. Obtener Días Bloqueados
app.get('/api/blocks', async (req, res) => {
  const { professionalId } = req.query;
  try {
    const blocks = await prisma.blockedDate.findMany({
      where: { professionalId: String(professionalId) },
      orderBy: { date: 'asc' }
    });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener bloqueos" });
  }
});

// 7. Bloquear un Día
app.post('/api/blocks', async (req, res) => {
  const { professionalId, date, reason } = req.body;
  try {
    const newBlock = await prisma.blockedDate.create({
      data: {
        date: new Date(date), // Se guarda la fecha completa
        professionalId,
        reason
      }
    });
    res.json(newBlock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al bloquear fecha" });
  }
});

// 8. Desbloquear Día
app.delete('/api/blocks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.blockedDate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error al desbloquear" });
  }
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
  console.log(`📅 Días no laborables: Domingos y Lunes`);
});