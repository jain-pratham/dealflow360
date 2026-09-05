const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up all database records...');
  
  await prisma.dealHealthAlert.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionSchedule.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.backorder.deleteMany();
  await prisma.fulfillmentAllocation.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.quotationAuditLog.deleteMany();
  await prisma.quotationComment.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.approvalChain.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.productPairing.deleteMany();
  await prisma.priceListItem.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('All database tables cleared successfully.');

  const adminEmail = process.env.ADMIN_EMAIL || 'jainpratham4050@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Jpdtp5!!';

  console.log(`Creating Admin user from .env credentials: ${adminEmail}`);

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: adminEmail.trim().toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  console.log('Admin user created successfully:', admin.email);
}

main()
  .catch((e) => {
    console.error('Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
