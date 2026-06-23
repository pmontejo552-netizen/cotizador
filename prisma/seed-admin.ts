// Crea el primer usuario administrador desde variables de entorno.
// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." npm run seed:admin
// (Alternativa: el primer login con esas credenciales también crea el admin si no
//  hay usuarios todavía — ver README.)
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Administrador';

  if (!email || !password) {
    console.error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Ya existe un usuario con ${email}. No se hace nada.`);
    return;
  }

  const user = await prisma.user.create({
    data: { name, email, role: 'admin', passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Administrador creado: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
