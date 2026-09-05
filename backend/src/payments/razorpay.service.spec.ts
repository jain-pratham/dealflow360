import { vi as jest } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

describe('RazorpayService', () => {
  let service: RazorpayService;
  let prisma: PrismaService;

  const mockPrismaService = {
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    quotationAuditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockBillingService = {
    findInvoiceById: jest.fn().mockResolvedValue({ id: 'inv-rzp-1', status: 'PAID' }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_mock';
      if (key === 'RAZORPAY_KEY_SECRET') return 'secret_test_mock';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RazorpayService>(RazorpayService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should calculate order amount in paise from database invoice balance', async () => {
      const mockInvoice = {
        id: 'inv-rzp-1',
        invoiceNumber: 'INV-2026-9001',
        amount: 50000,
        paidAmount: 0,
        remainingBalance: 50000,
        currency: 'INR',
        status: InvoiceStatus.UNPAID,
        customerId: 'cust-1',
        customer: { name: 'Acme Corp', companyName: 'Acme Corp', contactEmail: 'acme@example.com' },
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.createOrder('inv-rzp-1', {
        id: 'u-1',
        role: UserRole.CUSTOMER,
        customerId: 'cust-1',
      });

      expect(result.amount).toBe(50000);
      expect(result.amountInPaise).toBe(5000000);
      expect(result.currency).toBe('INR');
      expect(result.orderId).toBeDefined();
    });

    it('should throw ForbiddenException if customer requests order for invoice belonging to another customer', async () => {
      const mockInvoice = {
        id: 'inv-rzp-2',
        customerId: 'cust-2',
        status: InvoiceStatus.UNPAID,
        remainingBalance: 50000,
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.createOrder('inv-rzp-2', {
          id: 'u-[#]',
          role: UserRole.CUSTOMER,
          customerId: 'cust-HACKER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should verify signature and mark invoice PAID on valid test signature', async () => {
      const mockInvoice = {
        id: 'inv-rzp-3',
        invoiceNumber: 'INV-2026-9003',
        amount: 10000,
        paidAmount: 0,
        remainingBalance: 10000,
        currency: 'INR',
        status: InvoiceStatus.UNPAID,
        customerId: 'cust-3',
        customer: { name: 'Customer 3' },
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pmt-rzp-1',
        gatewayPaymentId: 'pay_test123',
        status: 'SUCCESS',
      });

      const orderId = 'order_test123';
      const paymentId = 'pay_test123';
      const validSignature = crypto
        .createHmac('sha256', 'secret_test_mock')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = await service.verifyPaymentSignature(
        {
          invoiceId: 'inv-rzp-3',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        },
        { id: 'u-3', role: UserRole.CUSTOMER, customerId: 'cust-3' },
      );

      expect(result.invoiceStatus).toBe(InvoiceStatus.PAID);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gateway: 'RAZORPAY',
            gatewayPaymentId: 'pay_test123',
            status: 'SUCCESS',
          }),
        }),
      );
    });
  });
});
