import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- ENDPOINT DE BIENVENIDA ---
app.get('/', (req, res) => {
  res.send('✅ Backend SaaS Multi-Rubro (V2) funcionando correctamente.');
});

// --- 1. OBTENER PROFESIONALES ---
app.get('/professionals', async (req, res) => {
  try {
    const { tenantId } = req.query; 
    const whereClause = tenantId ? { tenantId: String(tenantId) } : {};
    const professionals = await prisma.professional.findMany({ where: whereClause });
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
    const services = await prisma.service.findMany({ where: whereClause });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar servicios' });
  }
});

// --- 3. CREAR RESERVA (CORREGIDO PARA TU SCHEMA) ---
app.post('/appointments', async (req, res) => {
  try {
    const { professionalId, serviceId, date, customerName, customerPhone, customerEmail } = req.body;

    // Validación básica
    if (!professionalId || !serviceId || !date || !customerName) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // A. Buscamos el SERVICIO para obtener el tenantId
    const service = await prisma.service.findUnique({ 
      where: { id: String(serviceId) } 
    });

    if (!service) {
      return res.status(400).json({ error: 'Servicio no encontrado' });
    }

    const tenantId = service.tenantId;

    // B. Preparamos el Email (Tu base de datos LO EXIGE)
    // Si el frontend no manda email, inventamos uno con el teléfono para que no falle.
    const emailFinal = customerEmail || `${customerPhone}@sin-email.com`;

    // C. Buscamos o Creamos al Cliente
    let customer = await prisma.customer.findFirst({
      where: { 
        email: String(emailFinal),
        tenantId: tenantId 
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: String(customerName),
          email: String(emailFinal),
          phone: customerPhone ? String(customerPhone) : null,
          tenantId: tenantId 
        }
      });
    }

    // D. Calculamos la hora de fin
    const start = new Date(date);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // E. Creamos la cita
    const appointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
        professionalId: String(professionalId),
        serviceId: String(serviceId),
        customerId: customer.id
      },
    });

    res.json(appointment);

  } catch (error) {
    console.error("Error al crear reserva:", error);
    res.status(500).json({ error: 'Error interno', details: String(error) });
  }
});

// --- 4. VER TURNOS ---
app.get('/appointments', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { 
        service: true, 
        customer: true, 
        professional: true 
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar turnos" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ACTUALIZADO (V2) listo en el puerto ${PORT}`);
});