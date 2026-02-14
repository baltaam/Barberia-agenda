import { Request, Response } from 'express';
import { BookingService } from '../services/booking.service';

const service = new BookingService();

export const getSlots = async (req: Request, res: Response) => {
  try {
    const { professionalId, date } = req.query;
    const slots = await service.getAvailability(String(professionalId), String(date));
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener horarios" });
  }
};

export const bookSlot = async (req: Request, res: Response) => {
  try {
    const appointment = await service.createBooking(req.body);
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    // Manejo de error de concurrencia
    res.status(409).json({ error: error.message }); 
  }
};