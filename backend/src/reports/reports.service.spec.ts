import { vi as jest } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, QuotationStatus, CustomerTier, ApprovalStatus } from '@prisma/client';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrismaService = {
    customer: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([]),
    },
    product: {
      count: jest.fn().mockResolvedValue(10),
    },
    quotation: {
      count: jest.fn().mockResolvedValue(8),
      findMany: jest.fn().mockResolvedValue([]),
    },
    approvalRequest: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([]),
    },
    backorder: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
    },
    dealHealthAlert: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    invoice: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    subscriptionSchedule: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([]),
    },
    quotationLine: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    fulfillmentAllocation: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    warehouse: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
  const salesRepUser = { id: 'rep-1', role: UserRole.SALES_REP };
  const customerUser = { id: 'cust-1', role: UserRole.CUSTOMER };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if CUSTOMER tries to access reports', async () => {
    await expect(service.getOverview(customerUser)).rejects.toThrow(ForbiddenException);
    await expect(service.getSalesReport(customerUser)).rejects.toThrow(ForbiddenException);
    await expect(service.getBillingReport(customerUser)).rejects.toThrow(ForbiddenException);
  });

  it('should enforce salesRepId scoping for SALES_REP user', async () => {
    mockPrismaService.quotation.findMany.mockResolvedValue([]);

    await service.getSalesReport(salesRepUser, { salesRepId: 'other-rep-999' });

    expect(mockPrismaService.quotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          salesRepId: 'rep-1', // Overridden to logged in rep!
        }),
      }),
    );
  });

  it('should exclude DRAFT, REJECTED, and CANCELLED quotes from confirmed revenue', async () => {
    const mockQuotes = [
      { id: 'q1', status: QuotationStatus.DRAFT, totalAmount: '50000', currency: 'INR', createdAt: new Date() },
      { id: 'q2', status: QuotationStatus.REJECTED, totalAmount: '30000', currency: 'INR', createdAt: new Date() },
      { id: 'q3', status: QuotationStatus.CANCELLED, totalAmount: '20000', currency: 'INR', createdAt: new Date() },
      { id: 'q4', status: QuotationStatus.CONFIRMED, totalAmount: '100000', currency: 'INR', createdAt: new Date(), customer: { tier: 'GOLD' }, salesRep: { name: 'Alice' } },
    ];

    mockPrismaService.quotation.findMany.mockResolvedValue(mockQuotes);

    const report = await service.getSalesReport(adminUser);

    expect(report.totalQuotations).toBe(4);
    expect(report.confirmedQuotations).toBe(1);
    expect(report.confirmedRevenueByCurrency['INR']).toBe(100000);
    expect(report.conversionRate).toBe(25); // 1 out of 4 = 25%
  });

  it('should calculate available stock correctly as (quantityOnHand - quantityReserved)', async () => {
    const mockWarehouses = [
      {
        id: 'w1',
        name: 'Main Warehouse',
        code: 'WH-MAIN',
        inventoryItems: [
          { quantityOnHand: 100, quantityReserved: 30 },
          { quantityOnHand: 50, quantityReserved: 10 },
        ],
        allocations: [{ allocatedQuantity: 50, fulfilledQuantity: 40 }],
      },
    ];

    mockPrismaService.warehouse.findMany.mockResolvedValue(mockWarehouses);

    const report = await service.getWarehouseReport(adminUser);

    expect(report.totalWarehouses).toBe(1);
    const wh = report.warehouses[0];
    expect(wh.stockOnHand).toBe(150);
    expect(wh.reservedStock).toBe(40);
    expect(wh.availableStock).toBe(110); // 150 - 40 = 110
  });
});
