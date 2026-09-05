import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Starting DealFlow360 Database Initial Bootstrap...');

  const adminEmail = (
    process.env.ADMIN_EMAIL || 'admin@dealflow360.com'
  ).toLowerCase();
  const adminPassword =
    process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword123!';

  console.log(`Ensuring Bootstrap Admin user (${adminEmail})...`);

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Idempotent creation of initial Admin user ONLY.
  // NO demo customers, products, warehouses, discount rules, or fake users.
  await db.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
      isVerified: true,
    },
    create: {
      email: adminEmail,
      name: 'System Admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✅ DealFlow360 Initial Database Bootstrap Completed Successfully!');
  console.log('ℹ️ Database initialized with 0 sample business records.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
