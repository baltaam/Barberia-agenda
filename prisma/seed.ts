import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos SaaS en Render...');

  // --- NEGOCIO 1: BARBERÍA ---
  const barberia = await prisma.tenant.upsert({
    where: { slug: 'barberia-demo' },
    update: {},
    create: {
      name: 'Vikingos Barber Shop',
      slug: 'barberia-demo',
      themeColor: '#f59e0b', 
      category: 'Barbería & Spa',     // NUEVO: Para la etiqueta visual en Vercel
      address: 'Av. Corrientes 1234', // NUEVO: Dirección real
      phone: '5491122334455',         // NUEVO: Para el botón de WhatsApp
      openingHour: 10,                // NUEVO: Abre a las 10:00
      closingHour: 20,                // NUEVO: Cierra a las 20:00
      closedDays: '[0, 1]',           // NUEVO: Cierra Domingos(0) y Lunes(1)
      
      professionals: {
        create: [
          { name: 'Carlos (Master Barber)' }, 
          { name: 'Ana (Estilista)' }
        ]
      },
      services: {
        create: [
          { name: 'Corte Clásico', durationMin: 30, price: 1500 },
          { name: 'Barba Premium', durationMin: 20, price: 1000 },
          { name: 'Completo VIP', durationMin: 50, price: 2200 }
        ]
      }
    }
  });

  // --- NEGOCIO 2: KINESIOLOGÍA ---
  const kinesiologia = await prisma.tenant.upsert({
    where: { slug: 'kine-salud' },
    update: {},
    create: {
      name: 'Centro Kine Salud',
      slug: 'kine-salud',
      themeColor: '#0ea5e9', 
      category: 'Salud & Bienestar',
      address: 'Calle Falsa 123, Consultorio 4',
      phone: '5491199887766',
      openingHour: 8,                 // NUEVO: Abre a las 08:00
      closingHour: 17,                // NUEVO: Cierra a las 17:00
      closedDays: '[0, 6]',           // NUEVO: Cierra Sábados(6) y Domingos(0)
      
      professionals: {
        create: [
          { name: 'Lic. Laura Gomez' },
          { name: 'Dr. Pablo R.' }
        ]
      },
      services: {
        create: [
          { name: 'Fisioterapia', durationMin: 45, price: 8000 },
          { name: 'Masaje Descontracturante', durationMin: 60, price: 10000 },
          { name: 'Rehabilitación', durationMin: 40, price: 7500 }
        ]
      }
    }
  });

  console.log('✅ Datos creados exitosamente: Barbería y Kinesiólogo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });