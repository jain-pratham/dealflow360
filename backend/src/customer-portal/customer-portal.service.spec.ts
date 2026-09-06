import { Test, TestingModule } from '@nestjs/testing';
import { CustomerPortalService } from './customer-portal.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { BillingService } from '../billing/billing.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { QuotationStatus } from '@prisma/client';

describe('CustomerPortalService', () => {
  let service: CustomerPortalService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    quotation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  const mockDiscountRulesService = {};
  const mockBillingService = {};
  const mockSubscriptionsService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerPortalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DiscountRulesService, useValue: mockDiscountRulesService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
      ],
    }).compile();

    service = module.get<CustomerPortalService>(CustomerPortalService);
    prisma = module.get<PrismaService>(PrismaService);
    vi.clearAllMocks();
  });

  describe('getQuotations with Confirmed & Fulfilled filtering', () => {
    const mockCustomerUser = {
      id: 'user-cust-1',
      role: 'CUSTOMER',
      customerId: 'cust-id-123',
    };

    it('should query for both CONFIRMED and FULFILLED status when status=CONFIRMED is requested', async () => {
      mockPrisma.quotation.findMany.mockResolvedValue([
        {
          id: 'q-1',
          quoteNumber: 'QT-2026-0001',
          status: QuotationStatus.CONFIRMED,
          subtotalAmount: 1000,
          discountTotal: 0,
          taxTotal: 0,
          totalAmount: 1000,
          currency: 'INR',
          lines: [],
          invoices: [],
          fulfillmentAllocations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'q-2',
          quoteNumber: 'QT-2026-0002',
          status: QuotationStatus.FULFILLED,
          subtotalAmount: 2000,
          discountTotal: 0,
          taxTotal: 0,
          totalAmount: 2000,
          currency: 'INR',
          lines: [],
          invoices: [],
          fulfillmentAllocations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getQuotations(mockCustomerUser, undefined, QuotationStatus.CONFIRMED);

      expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'cust-id-123',
            status: {
              in: [QuotationStatus.CONFIRMED, QuotationStatus.FULFILLED],
            },
          }),
        }),
      );

      expect(result.length).toBe(2);
      expect(result.map((q) => q.status)).toEqual([QuotationStatus.CONFIRMED, QuotationStatus.FULFILLED]);
    });

    it('should block DRAFT, REJECTED, CANCELLED from portal queries when requested', async () => {
      mockPrisma.quotation.findMany.mockResolvedValue([]);

      await service.getQuotations(mockCustomerUser, undefined, 'DRAFT');

      expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'cust-id-123',
            status: 'NON_EXISTENT_STATUS_FILTER',
          }),
        }),
      );
    });

    it('should strictly enforce user.customerId filter matching user account', async () => {
      mockPrisma.quotation.findMany.mockResolvedValue([]);

      await service.getQuotations({ id: 'user-a', customerId: 'customer-a-uuid' });

      expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'customer-a-uuid',
          }),
        }),
      );
    });
  });
});
