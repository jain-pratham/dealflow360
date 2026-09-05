const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting Complete Database Wipe & Reset...');

  console.log('1. Clearing Deal Health Alerts...');
  await prisma.dealHealthAlert.deleteMany();

  console.log('2. Clearing Payments, Invoice Lines, Invoices...');
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();

  console.log('3. Clearing Subscription Schedules & Subscription Plans...');
  await prisma.subscriptionSchedule.deleteMany();
  await prisma.subscriptionPlan.deleteMany();

  console.log('4. Clearing Backorders & Fulfillment Allocations...');
  await prisma.backorder.deleteMany();
  await prisma.fulfillmentAllocation.deleteMany();

  console.log('5. Clearing Inventory Adjustments, Items & Warehouses...');
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.warehouse.deleteMany();

  console.log('6. Clearing Quotations, Lines, Audit Logs, Comments, Approvals & Chains...');
  await prisma.quotationAuditLog.deleteMany();
  await prisma.quotationComment.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.approvalChain.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();

  console.log('7. Clearing Product Pairings, Price List Items, Price Lists, Variants, Products & Categories...');
  await prisma.productPairing.deleteMany();
  await prisma.priceListItem.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.productCategory.deleteMany();

  console.log('8. Clearing Customers & Users...');
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ ALL business data, warehouses, products, quotations, and users wiped successfully!');

  // Re-create initial bootstrap Admin user
  const adminEmail = (process.env.ADMIN_EMAIL || 'jainpratham4050@gmail.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Jpdtp5!!';

  console.log(`Re-creating Admin user: ${adminEmail}...`);
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  console.log('👤 Admin user recreated:', admin.email);

  console.log('\n📊 Database Status Verification:');
  const counts = {
    warehouses: await prisma.warehouse.count(),
    products: await prisma.product.count(),
    categories: await prisma.productCategory.count(),
    customers: await prisma.customer.count(),
    quotations: await prisma.quotation.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    fulfillmentAllocations: await prisma.fulfillmentAllocation.count(),
    backorders: await prisma.backorder.count(),
    users: await prisma.user.count(),
  };
  console.log(counts);
}

main()
  .catch((e) => {
    console.error('❌ Wipe error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
