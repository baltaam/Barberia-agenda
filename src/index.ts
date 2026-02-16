import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Configuración de seguridad y lectura de datos
app.use(cors());
app.use(express.json());

// --- ENDPOINT DE BIENVENIDA ---
app.get('/', (req, res) => {
  res.send('✅ Backend Multi-Rubro funcionando. Rutas disponibles: /professionals, /services, /appointments');
});

// --- 1. OBTENER PROFESIONALES (Filtrado por Negocio) ---
app.get('/professionals', async (req, res) => {
  try {
    const { tenantId } = req.query; // Leemos si el frontend pide un negocio específico

    const whereClause = tenantId ? { tenantId: String(tenantId) } : {};

    const professionals = await prisma.professional.findMany({
      where: whereClause
    });
    
    res.json(professionals);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar profesionales' });
  }
});

// --- 2. OBTENER SERVICIOS (Filtrado por Negocio) ---
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

// --- 3. CREAR RESERVA (El Corazón del Sistema) ---
app.post('/appointments', async (req, res) => {
  try {
    // 1. Recibimos los datos del formulario web
    const { professionalId, serviceId, date, customerName, customerPhone, customerEmail } = req.body;

    // Validación rápida
    if (!professionalId || !serviceId || !date || !customerName || !customerPhone) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // 2. BUSCAMOS EL SERVICIO (Paso Clave)
    // Necesitamos el servicio para saber:
    // a) Cuánto dura el turno.
    // b) A qué negocio (Tenant) pertenece.
    const service = await prisma.service.findUnique({ 
      where: { id: String(serviceId) } 
    });

    if (!service) {
      return res.status(400).json({ error: 'El servicio seleccionado no existe' });
    }

    const tenantId = service.tenantId; // ¡Aquí obtenemos el ID del negocio!

    // 3. GESTIÓN DEL CLIENTE
    // Buscamos si el cliente ya existe EN ESTE NEGOCIO (tenantId)
    let customer = await prisma.customer.findFirst({
      where: { 
        phone: String(customerPhone),
        tenantId: tenantId 
      }
    });

    if (!customer) {
      // Si es nuevo, lo creamos y lo asignamos al negocio correcto
      customer = await prisma.customer.create({
        data: {
          name: String(customerName),
          phone: String(customerPhone),
          email: String(customerEmail || ""),
          tenantId: tenantId // <--- ESTO EVITA EL ERROR QUE TENÍAS
        }
      });
    }

    // 4. CÁLCULO DE HORARIOS
    const duration = service.durationMin; 
    const start = new Date(date);
    const end = new Date(start.getTime() + duration * 60000); // Sumamos minutos

    // 5. CREAR LA CITA FINAL
    const appointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
        professionalId: String(professionalId),
        serviceId: String(serviceId),
        customerId: String(customer.id)
      },
    });

    res.json(appointment);

  } catch (error) {
    console.error("Error detallado:", error);
    res.status(500).json({ error: 'Error interno al procesar la reserva' });
  }
});

// --- 4. VER TURNOS (Panel de Admin) ---
app.get('/appointments', async (req, res) => {
  try {
    const { date, professionalId } = req.query;
    
    // Filtros opcionales para el dashboard
    const whereClause: any = {};
    if (professionalId) whereClause.professionalId = String(professionalId);
    
    // Si mandan fecha, filtramos por ese día
    if (date) {
      const searchDate = new Date(String(date));
      const nextDay = new Date(searchDate);
      nextDay.setDate(searchDate.getDate() + 1);

      whereClause.startTime = {
        gte: searchDate,
        lt: nextDay
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: { 
        service: true, 
        customer: true,
        professional: true
      },
      orderBy: { startTime: 'asc' }
    });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar los turnos" });
  }
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor Multi-Rubro listo en el puerto ${PORT}`);
});