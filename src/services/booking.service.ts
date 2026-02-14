import { PrismaClient } from '@prisma/client';
import { addMinutes, isBefore, isAfter, areIntervalsOverlapping } from 'date-fns';

const prisma = new PrismaClient();

export class BookingService {
  
  // Obtener disponibilidad real calculada
  async getAvailability(professionalId: string, dateStr: string) {
    // 1. Obtener horario laboral del profesional para ese día
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0-6
    
    const schedule = await prisma.schedule.findFirst({
      where: { professionalId, dayOfWeek }
    });

    if (!schedule) return []; // No trabaja ese día

    // 2. Obtener turnos ya ocupados ese día
    const startOfDay = new Date(${dateStr}T00:00:00Z);
    const endOfDay = new Date(${dateStr}T23:59:59Z);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELED' }
      }
    });

    // 3. Generar slots libres (Simplificado para el ejemplo)
    // En producción, esto cruza los intervalos libres con la duración del servicio
    return this.calculateFreeSlots(schedule, existingAppointments, dateStr);
  }

  // Lógica crítica: Crear Reserva con Transacción ACID
  async createBooking(data: { 
    tenantId: string, 
    professionalId: string, 
    serviceId: string, 
    startTime: string, 
    customerName: string,
    customerEmail: string 
  }) {
    const start = new Date(data.startTime);
    
    // Obtener duración del servicio
    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service) throw new Error("Servicio no encontrado");
    
    const end = addMinutes(start, service.durationMin);

    // INICIO TRANSACCIÓN: Esto bloquea la operación para asegurar consistencia
    return await prisma.$transaction(async (tx) => {
      
      // 1. Doble chequeo: ¿Hay conflicto de horario en este preciso milisegundo?
      const conflicts = await tx.appointment.count({
        where: {
          professionalId: data.professionalId,
          status: { not: 'CANCELED' },
          OR: [
            { startTime: { lt: end }, endTime: { gt: start } } // Lógica de superposición
          ]
        }
      });

      if (conflicts > 0) {
        throw new Error("El turno acaba de ser ocupado por otra persona.");
      }

      // 2. Crear o buscar cliente
      let customer = await tx.customer.findFirst({
        where: { email: data.customerEmail, tenantId: data.tenantId }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: data.customerName,
            email: data.customerEmail,
            phone: "00000000",
            tenantId: data.tenantId
          }
        });
      }

      // 3. Crear la cita
      return await tx.appointment.create({
        data: {
          startTime: start,
          endTime: end,
          professionalId: data.professionalId,
          serviceId: data.serviceId,
          customerId: customer.id
        }
      });
    });
  }

  private calculateFreeSlots(schedule: any, appointments: any[], dateStr: string) {
    // Aquí iría la lógica matemática de restar intervalos ocupados al horario laboral
    // Retorna array de strings ["10:00", "10:30"...]
    // (Omitido por brevedad, pero esencial en prod)
    return ["10:00", "11:00"]; // Placeholder
  }
}