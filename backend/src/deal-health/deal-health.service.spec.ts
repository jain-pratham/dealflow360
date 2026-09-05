import { vi as jest } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DealHealthService } from './deal-health.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { DealHealthGateway } from './deal-health.gateway';
import { QuotationStatus, ApprovalStatus } from '@prisma/client';

describe('DealHealthService', () => {
  let service: DealHealthService;

  const mockPrismaService = {
    quotation: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    dealHealthAlert: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
    },
  };

  const mockDiscountRulesService = {
    evaluateDiscount: jest.fn().mockResolvedValue({
      allowed: true,
      requiresApproval: false,
      approvalThresholdPercent: 15,
      maxAllowedDiscount: 30,
    }),
  };

  const mockGateway = {
    emitHealthUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealHealthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DiscountRulesService, useValue: mockDiscountRulesService },
        { provide: DealHealthGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<DealHealthService>(DealHealthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recalculateQuotationHealth', () => {
    it('should return 100 score HEALTHY status for a fresh draft quotation with no risks', async () => {
      const mockQuotation = {
        id: 'q-100',
        quoteNumber: 'QT-2026-0100',
        status: QuotationStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalAmount: 10000,
        customerId: 'cust-1',
        customer: { tier: 'STANDARD' },
        lines: [
          {
            id: 'l-1',
            quantity: 1,
            unitPrice: '10000',
            finalUnitPrice: '10000',
            discountPercent: '5',
            product: { productType: 'HARDWARE' },
          },
        ],
        approvalRequests: [],
        stockAllocations: [],
        backorders: [],
        invoices: [],
      };

      mockPrismaService.quotation.findUnique.mockResolvedValue(mockQuotation);
      mockPrismaService.dealHealthAlert.findMany.mockResolvedValue([]);
      mockPrismaService.quotation.update.mockImplementation(async ({ data }) => ({
        ...mockQuotation,
        ...data,
      }));

      const result = await service.recalculateQuotationHealth('q-100');

      expect(result.score).toBe(100);
      expect(result.status).toBe('HEALTHY');
      expect(result.alerts.length).toBe(0);
    });

    it('should assign CRITICAL status when rejection and high discount risks combine', async () => {
      mockDiscountRulesService.evaluateDiscount.mockResolvedValueOnce({
        allowed: false,
        requiresApproval: true,
        approvalRole: 'SALES_MANAGER',
      });

      const mockQuotation = {
        id: 'q-101',
        quoteNumber: 'QT-2026-0101',
        status: QuotationStatus.REJECTED,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
        updatedAt: new Date(),
        totalAmount: 10000,
        customerId: 'cust-1',
        customer: { tier: 'STANDARD' },
        lines: [
          {
            id: 'l-1',
            quantity: 1,
            unitPrice: '10000',
            finalUnitPrice: '5000',
            discountPercent: '50', // Exceeds max 30%
            product: { name: 'Hardware Unit', productType: 'HARDWARE' },
          },
        ],
        approvalRequests: [
          {
            id: 'app-1',
            status: ApprovalStatus.REJECTED,
            reason: 'Discount too high',
            createdAt: new Date(),
          },
        ],
        stockAllocations: [],
        backorders: [{ id: 'bo-1', status: 'PENDING' }],
        invoices: [{ id: 'inv-1', status: 'OVERDUE', dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), payments: [] }],
      };

      mockPrismaService.quotation.findUnique.mockResolvedValue(mockQuotation);
      mockPrismaService.dealHealthAlert.findMany.mockResolvedValue([]);
      mockPrismaService.quotation.update.mockImplementation(async ({ data }) => ({
        ...mockQuotation,
        ...data,
      }));

      const result = await service.recalculateQuotationHealth('q-101');

      expect(result.score).toBeLessThan(50);
      expect(result.status).toBe('CRITICAL');
    });

    it('should deduplicate unresolved alerts using application-level deterministic keys', async () => {
      const mockQuotation = {
        id: 'q-102',
        quoteNumber: 'QT-2026-0102',
        status: QuotationStatus.PENDING_APPROVAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalAmount: 10000,
        customerId: 'cust-1',
        lines: [],
        approvalRequest: {
          id: 'app-2',
          status: ApprovalStatus.PENDING,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days pending
        },
        stockAllocations: [],
        backorderLogs: [],
        invoices: [],
      };

      const existingAlert = {
        id: 'existing-alert-1',
        quotationId: 'q-102',
        alertType: 'APPROVAL_DELAY',
        deduplicationKey: 'q-102:APPROVAL_DELAY:PENDING_5d',
        resolvedAt: null,
      };

      mockPrismaService.quotation.findUnique.mockResolvedValue(mockQuotation);
      mockPrismaService.dealHealthAlert.findMany.mockResolvedValue([existingAlert]);
      mockPrismaService.quotation.update.mockImplementation(async ({ data }) => ({
        ...mockQuotation,
        ...data,
      }));

      const result = await service.recalculateQuotationHealth('q-102');

      // Alert already exists, should NOT create duplicate
      expect(mockPrismaService.dealHealthAlert.create).not.toHaveBeenCalled();
    });
  });
});
