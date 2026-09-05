import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@dealflow360.com' },
  });

  const adminUser = admin as any;

  console.log('Seeded Admin User:', {
    id: adminUser?.id,
    email: adminUser?.email,
    role: adminUser?.role,
    isActive: adminUser?.isActive,
    isVerified: adminUser?.isVerified,
    hasPasswordHash: !!adminUser?.passwordHash,
  });

  if (!adminUser || adminUser.role !== 'ADMIN' || !adminUser.isActive || !adminUser.isVerified) {
    throw new Error('Admin verification failed!');
  }
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
