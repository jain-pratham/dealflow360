import { vi as jest } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionInterval } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    subscriptionSchedule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
    },
    quotationAuditLog: {
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'cust-user-1' }),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
    notifyRoles: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRecurringInvoices', () => {
    it('should generate a recurring invoice when active subscription is due', async () => {
      const dueSub = {
        id: 'sub-10',
        quotationId: 'q-10',
        productId: 'prod-10',
        planId: 'plan-10',
        billingCycle: SubscriptionInterval.MONTHLY,
        nextBillingDate: new Date('2026-09-01'),
        unitPrice: 5000,
        quantity: 1,
        currency: 'INR',
        status: 'ACTIVE',
        product: { name: 'Support Service' },
        quotation: { customerId: 'cust-10' },
      };

      mockPrismaService.subscriptionSchedule.findMany.mockResolvedValue([dueSub]);
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);
      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-rec-1',
        invoiceNumber: 'INV-REC-2026-0002',
        amount: 5000,
      });

      const result = await service.generateRecurringInvoices();

      expect(result.generatedInvoicesCount).toBe(1);
      expect(mockPrismaService.invoice.create).toHaveBeenCalled();
      expect(mockPrismaService.subscriptionSchedule.update).toHaveBeenCalled();
    });

    it('should skip recurring invoice creation if idempotency key already exists', async () => {
      const dueSub = {
        id: 'sub-11',
        quotationId: 'q-11',
        productId: 'prod-11',
        planId: 'plan-11',
        billingCycle: SubscriptionInterval.MONTHLY,
        nextBillingDate: new Date('2026-09-01'),
        unitPrice: 5000,
        quantity: 1,
        currency: 'INR',
        status: 'ACTIVE',
        product: { name: 'Support Service' },
        quotation: { customerId: 'cust-11' },
      };

      mockPrismaService.subscriptionSchedule.findMany.mockResolvedValue([dueSub]);
      mockPrismaService.invoice.findUnique.mockResolvedValue({ id: 'existing-inv' });

      const result = await service.generateRecurringInvoices();

      expect(result.generatedInvoicesCount).toBe(0);
      expect(mockPrismaService.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should update subscription status to PAUSED', async () => {
      mockPrismaService.subscriptionSchedule.findUnique.mockResolvedValue({
        id: 'sub-20',
        status: 'ACTIVE',
      });
      mockPrismaService.subscriptionSchedule.update.mockResolvedValue({
        id: 'sub-20',
        status: 'PAUSED',
      });

      const result = await service.pause('sub-20');

      expect(result.status).toBe('PAUSED');
      expect(mockPrismaService.subscriptionSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'PAUSED' },
        }),
      );
    });
  });
});
