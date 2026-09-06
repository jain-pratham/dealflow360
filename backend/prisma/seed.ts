import { PrismaClient, SubscriptionInterval } from '@prisma/client';
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

  console.log('Ensuring Subscription Plans (PLAN-MON, PLAN-ANN)...');

  // PLAN-MON: Monthly Enterprise Subscription
  await db.subscriptionPlan.upsert({
    where: { id: '00000000-0000-4000-a000-000000000001' },
    update: {
      name: 'Monthly Enterprise Subscription',
      interval: SubscriptionInterval.MONTHLY,
      prorationPolicy: 'EXACT_DAY_PRO_RATA',
      refundPolicy: 'PARTIAL_CREDIT_NOTE',
      isActive: true,
    },
    create: {
      id: '00000000-0000-4000-a000-000000000001',
      name: 'Monthly Enterprise Subscription',
      interval: SubscriptionInterval.MONTHLY,
      price: 10000.0,
      currency: 'INR',
      prorationPolicy: 'EXACT_DAY_PRO_RATA',
      refundPolicy: 'PARTIAL_CREDIT_NOTE',
      isActive: true,
    },
  });

  // PLAN-ANN: Annual Enterprise License
  await db.subscriptionPlan.upsert({
    where: { id: '00000000-0000-4000-a000-000000000002' },
    update: {
      name: 'Annual Enterprise License',
      interval: SubscriptionInterval.YEARLY,
      prorationPolicy: 'MONTHLY_PRO_RATA',
      refundPolicy: 'NON_REFUNDABLE',
      isActive: true,
    },
    create: {
      id: '00000000-0000-4000-a000-000000000002',
      name: 'Annual Enterprise License',
      interval: SubscriptionInterval.YEARLY,
      price: 100000.0,
      currency: 'INR',
      prorationPolicy: 'MONTHLY_PRO_RATA',
      refundPolicy: 'NON_REFUNDABLE',
      isActive: true,
    },
  });

  console.log('Ensuring Default Approval Chains (Standard Manager Approval, Finance High-Risk Governance)...');

  await db.approvalChain.upsert({
    where: { id: '00000000-0000-4000-b000-000000000001' },
    update: {
      name: 'Standard Manager Approval',
      description: 'Triggered when discount exceeds 5%',
      requiredRole: 'SALES_MANAGER',
      sequence: 1,
      isActive: true,
    },
    create: {
      id: '00000000-0000-4000-b000-000000000001',
      name: 'Standard Manager Approval',
      description: 'Triggered when discount exceeds 5%',
      requiredRole: 'SALES_MANAGER',
      sequence: 1,
      isActive: true,
    },
  });

  await db.approvalChain.upsert({
    where: { id: '00000000-0000-4000-b000-000000000002' },
    update: {
      name: 'Finance High-Risk Governance',
      description: 'Triggered for finance-level risk',
      requiredRole: 'FINANCE',
      sequence: 2,
      isActive: true,
    },
    create: {
      id: '00000000-0000-4000-b000-000000000002',
      name: 'Finance High-Risk Governance',
      description: 'Triggered for finance-level risk',
      requiredRole: 'FINANCE',
      sequence: 2,
      isActive: true,
    },
  });

  console.log('✅ DealFlow360 Initial Database Bootstrap Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
