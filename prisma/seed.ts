import { PrismaClient } from '@prisma/client';

// Iniciamos el cliente de forma simple
const prisma = new PrismaClient();

async function main() {
  // 1. Crear Barbería (Tenant)
  const barberia = await prisma.tenant.upsert({
    where: { slug: 'barberia-demo' },
    update: {}, // Si existe, no hace nada
    create: {
      name: 'Barbería Demo',
      slug: 'barberia-demo',
      themeColor: '#1e293b', // Un color oscuro elegante
      
      // 2. Crear Profesionales
      professionals: {
        create: [
          { name: 'Carlos (Barbero)' }, 
          { name: 'Ana (Estilista)' }
        ]
      },
      
      // 3. Crear Servicios
      services: {
        create: [
          { name: 'Corte Clásico', durationMin: 30, price: 1500 },
          { name: 'Barba y Toalla', durationMin: 20, price: 1000 },
          { name: 'Completo (Corte + Barba)', durationMin: 50, price: 2200 }
        ]
      }
    }
  });

  console.log('✅ Datos de prueba creados:', barberia.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });