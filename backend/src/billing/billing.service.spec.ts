import { vi as jest } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, InvoiceType, LineType } from '@prisma/client';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { DealHealthService } from '../deal-health/deal-health.service';

import { NotificationsService } from '../notifications/notifications.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    invoice: {
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    quotation: {
      findUnique: jest.fn(),
    },
    subscriptionSchedule: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    subscriptionPlan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'cust-user-1' }),
    },
    quotationAuditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockDealHealthService = {
    recalculateQuotationHealth: jest.fn().mockResolvedValue({}),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
    notifyRoles: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DealHealthService, useValue: mockDealHealthService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processConfirmedQuotation', () => {
    it('should generate a ONE_TIME invoice for one-time quotation lines', async () => {
      const mockQuotation = {
        id: 'q-1',
        quoteNumber: 'QT-2026-0001',
        customerId: 'cust-1',
        currency: 'INR',
        lines: [
          {
            id: 'line-1',
            productId: 'prod-1',
            lineType: LineType.ONE_TIME,
            quantity: 2,
            unitPrice: '50000.00',
            discountAmount: '0.00',
            taxAmount: '0.00',
            finalUnitPrice: '100000.00',
            product: { name: 'Laptop', productType: 'HARDWARE' },
          },
        ],
      };

      mockPrismaService.quotation.findUnique.mockResolvedValue(mockQuotation);
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.count.mockResolvedValue(1);
      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0002',
        amount: 100000,
        status: InvoiceStatus.UNPAID,
      });

      const result = await service.processConfirmedQuotation('q-1');

      expect(result.invoice).toBeDefined();
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceType: InvoiceType.ONE_TIME,
            amount: 100000,
            remainingBalance: 100000,
          }),
        }),
      );
    });

    it('should create a SubscriptionSchedule for recurring lines in hybrid quotation', async () => {
      const mockQuotation = {
        id: 'q-2',
        quoteNumber: 'QT-2026-0002',
        customerId: 'cust-2',
        currency: 'INR',
        lines: [
          {
            id: 'line-rec-1',
            productId: 'prod-rec-1',
            lineType: LineType.RECURRING,
            quantity: 1,
            unitPrice: '5000.00',
            discountAmount: '0.00',
            taxAmount: '0.00',
            finalUnitPrice: '5000.00',
            subscriptionPlanId: 'plan-1',
            product: { name: 'Support Service', productType: 'SUBSCRIPTION' },
          },
        ],
      };

      mockPrismaService.quotation.findUnique.mockResolvedValue(mockQuotation);
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({ id: 'plan-1', interval: 'MONTHLY' });
      mockPrismaService.subscriptionSchedule.findFirst.mockResolvedValue(null);
      mockPrismaService.subscriptionSchedule.create.mockResolvedValue({
        id: 'sub-1',
        unitPrice: 5000,
        status: 'ACTIVE',
      });

      const result = await service.processConfirmedQuotation('q-2');

      expect(result.subscriptions).toHaveLength(1);
      expect(mockPrismaService.subscriptionSchedule.create).toHaveBeenCalled();
    });
  });

  describe('recordPayment', () => {
    it('should update invoice to PAID when exact remaining balance is paid', async () => {
      const mockInvoice = {
        id: 'inv-100',
        invoiceNumber: 'INV-2026-0100',
        amount: 50000,
        paidAmount: 0,
        remainingBalance: 50000,
        currency: 'INR',
        status: InvoiceStatus.UNPAID,
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pmt-1',
        amount: 50000,
        status: 'SUCCESS',
      });

      const result = await service.recordPayment('inv-100', {
        amount: 50000,
        paymentMethod: 'BANK_TRANSFER',
      });

      expect(result.invoiceStatus).toBe(InvoiceStatus.PAID);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-100' },
        data: expect.objectContaining({
          paidAmount: 50000,
          remainingBalance: 0,
          status: InvoiceStatus.PAID,
        }),
      });
    });

    it('should throw BadRequestException if payment exceeds remaining balance', async () => {
      const mockInvoice = {
        id: 'inv-101',
        invoiceNumber: 'INV-2026-0101',
        amount: 10000,
        paidAmount: 5000,
        remainingBalance: 5000,
        currency: 'INR',
        status: InvoiceStatus.PARTIALLY_PAID,
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.recordPayment('inv-101', {
          amount: 6000,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
