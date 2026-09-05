import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://dealflow_user:dealflow_app_secure_pass_2026@localhost:5433/dealflow_db?schema=public',
    },
  },
});

async function main() {
  const users = await prisma.user.findMany();
  const customers = await prisma.customer.findMany();
  const products = await prisma.product.findMany();
  const warehouses = await prisma.warehouse.findMany();
  const rules = await prisma.discountRule.findMany();

  console.log('====================================================');
  console.log('   DEALFLOW360 SEEDED DATABASE VERIFICATION          ');
  console.log('====================================================');
  console.log(`✔ Users Count:       ${users.length}`);
  console.log(`  Users List:        ${users.map((u) => `${u.name} (${u.role})`).join(', ')}`);
  console.log(`✔ Customers Count:   ${customers.length}`);
  console.log(`  Customers:         ${customers.map((c) => `${c.name} [Tier: ${c.tier}]`).join(', ')}`);
  console.log(`✔ Products Count:    ${products.length}`);
  console.log(`  Products:          ${products.map((p) => `${p.name} ($${p.basePrice})`).join(', ')}`);
  console.log(`✔ Warehouses Count:  ${warehouses.length}`);
  console.log(`  Warehouses:        ${warehouses.map((w) => `${w.name} (${w.location})`).join(', ')}`);
  console.log(`✔ Discount Rules:    ${rules.length} configured`);
  console.log('====================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
