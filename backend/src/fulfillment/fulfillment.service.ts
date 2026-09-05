import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  BackorderStatus,
  FulfillmentStatus,
  QuotationStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FulfillmentEngineService } from './fulfillment-engine.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { FulfillBackorderDto } from './dto/fulfill-backorder.dto';
import {
  AdjustInventoryDto,
  InventoryAdjustmentType,
} from './dto/adjust-inventory.dto';
import { DealHealthService } from '../deal-health/deal-health.service';

@Injectable()
export class FulfillmentService implements OnModuleInit {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfillmentEngine: FulfillmentEngineService,
    private readonly dealHealthService: DealHealthService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultWarehousesAndInventory();
  }

  /**
   * Initializes default warehouses and inventory snapshots if database is empty.
   */
  private async seedDefaultWarehousesAndInventory() {
    try {
      const warehouseCount = await this.prisma.warehouse.count();
      if (warehouseCount === 0) {
        this.logger.log('Initializing default multi-warehouse infrastructure (WH-A, WH-B, WH-C)...');

        const whA = await this.prisma.warehouse.create({
          data: {
            name: 'Main Distribution Center',
            code: 'WH-A',
            location: 'New York, USA',
            shippingCostWeighting: 1.0,
            isActive: true,
          },
        });

        const whB = await this.prisma.warehouse.create({
          data: {
            name: 'West Coast Logistics Hub',
            code: 'WH-B',
            location: 'Los Angeles, USA',
            shippingCostWeighting: 1.2,
            isActive: true,
          },
        });

        const whC = await this.prisma.warehouse.create({
          data: {
            name: 'East Coast Fulfillment Center',
            code: 'WH-C',
            location: 'Chicago, USA',
            shippingCostWeighting: 1.1,
            isActive: true,
          },
        });

        // Seed stock for existing products across warehouses
        const products = await this.prisma.product.findMany({ take: 10 });
        for (const prod of products) {
          await this.prisma.inventoryItem.createMany({
            data: [
              { warehouseId: whA.id, productId: prod.id, quantityOnHand: 6, quantityReserved: 0 },
              { warehouseId: whB.id, productId: prod.id, quantityOnHand: 4, quantityReserved: 0 },
              { warehouseId: whC.id, productId: prod.id, quantityOnHand: 10, quantityReserved: 0 },
            ],
            skipDuplicates: true,
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Default warehouse seeding skipped: ${err.message}`);
    }
  }

  // --- FULFILLMENT CREATION & ENGINE ORCHESTRATION ---

  async createFulfillmentForQuotation(
    quotationId: string,
    currentUser: any,
    manualAllocations?: Array<{
      lineId: string;
      allocations: Array<{ warehouseId: string; quantity: number }>;
    }>,
  ) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: { include: { product: true } },
        fulfillmentAllocations: true,
        backorders: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (currentUser.role === UserRole.SALES_REP && quotation.salesRepId !== currentUser.id) {
      throw new ForbiddenException('You can only create fulfillments for your own quotations.');
    }

    if (
      quotation.status !== QuotationStatus.CONFIRMED &&
      quotation.status !== QuotationStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Quotation must be CONFIRMED before creating fulfillment. Current status: '${quotation.status}'.`,
      );
    }

    if (quotation.lines.length === 0) {
      throw new BadRequestException('Cannot fulfill quotation with no line items.');
    }

    const existingAllocationsMap = new Map<string, number>();
    quotation.fulfillmentAllocations.forEach((alloc) => {
      if (alloc.quotationLineId) {
        const current = existingAllocationsMap.get(alloc.quotationLineId) || 0;
        existingAllocationsMap.set(alloc.quotationLineId, current + alloc.allocatedQuantity);
      }
    });

    const engineInput = quotation.lines.map((line) => ({
      lineId: line.id,
      productId: line.productId,
      requestedQuantity: line.quantity,
      alreadyAllocatedQuantity: existingAllocationsMap.get(line.id) || 0,
    }));

    const warehouses = await this.prisma.warehouse.findMany({
      where: { isActive: true },
    });

    const formattedWarehouses = warehouses.map((w) => ({
      ...w,
      shippingCostWeighting: Number(w.shippingCostWeighting),
    }));

    const productIds = quotation.lines.map((l) => l.productId);
    const inventorySnapshots = await this.prisma.inventoryItem.findMany({
      where: {
        productId: { in: productIds },
        warehouseId: { in: warehouses.map((w) => w.id) },
      },
    });

    let plan: any;

    if (manualAllocations && Array.isArray(manualAllocations) && manualAllocations.length > 0) {
      // Manual Warehouse Split Override logic
      const lineResults: any[] = [];
      let totalAllocated = 0;
      let totalBackordered = 0;

      for (const line of quotation.lines) {
        const alreadyAllocated = existingAllocationsMap.get(line.id) || 0;
        const remainingNeeded = Math.max(0, line.quantity - alreadyAllocated);

        const manualOverrideForLine = manualAllocations.find((m) => m.lineId === line.id);

        if (manualOverrideForLine && Array.isArray(manualOverrideForLine.allocations)) {
          const lineAllocations: any[] = [];
          const seenWarehouseIds = new Set<string>();
          let lineTotalAllocated = 0;

          for (const allocInput of manualOverrideForLine.allocations) {
            const allocQty = Number(allocInput.quantity) || 0;
            if (allocQty < 0) {
              throw new BadRequestException(
                `Allocation quantity for line '${line.product.name}' cannot be negative.`,
              );
            }
            if (allocQty === 0) continue;

            if (seenWarehouseIds.has(allocInput.warehouseId)) {
              throw new BadRequestException(
                `Duplicate warehouse allocation for product '${line.product.name}'.`,
              );
            }
            seenWarehouseIds.add(allocInput.warehouseId);

            const warehouse = formattedWarehouses.find((w) => w.id === allocInput.warehouseId);
            if (!warehouse) {
              throw new BadRequestException(
                `Warehouse with ID '${allocInput.warehouseId}' is not active or does not exist.`,
              );
            }

            const invItem = inventorySnapshots.find(
              (i) => i.warehouseId === allocInput.warehouseId && i.productId === line.productId,
            );
            const availableStock = invItem
              ? Math.max(0, invItem.quantityOnHand - invItem.quantityReserved)
              : 0;

            if (allocQty > availableStock) {
              throw new BadRequestException(
                `Allocation of ${allocQty} units from warehouse '${warehouse.code}' exceeds available stock of ${availableStock} for product '${line.product.name}'.`,
              );
            }

            lineTotalAllocated += allocQty;
            lineAllocations.push({
              warehouseId: warehouse.id,
              warehouseCode: warehouse.code,
              allocatedQuantity: allocQty,
            });
          }

          if (lineTotalAllocated > remainingNeeded) {
            throw new BadRequestException(
              `Total manual allocation (${lineTotalAllocated}) exceeds requested remaining quantity (${remainingNeeded}) for product '${line.product.name}'.`,
            );
          }

          const backorderQuantity = Math.max(0, remainingNeeded - lineTotalAllocated);
          totalAllocated += lineTotalAllocated;
          totalBackordered += backorderQuantity;

          lineResults.push({
            lineId: line.id,
            productId: line.productId,
            requestedQuantity: line.quantity,
            alreadyAllocatedQuantity: alreadyAllocated,
            remainingNeededQuantity: remainingNeeded,
            allocations: lineAllocations,
            backorderQuantity,
            isFullyAllocated: backorderQuantity === 0,
          });
        } else {
          // Fallback to engine calculation for line without manual override specified
          const singleLineInput = [
            {
              lineId: line.id,
              productId: line.productId,
              requestedQuantity: line.quantity,
              alreadyAllocatedQuantity: alreadyAllocated,
            },
          ];
          const autoPlan = this.fulfillmentEngine.calculateFulfillmentPlan(
            singleLineInput,
            formattedWarehouses,
            inventorySnapshots,
          );
          if (autoPlan.lineResults[0]) {
            lineResults.push(autoPlan.lineResults[0]);
            totalAllocated += autoPlan.lineResults[0].allocations.reduce(
              (sum: number, a: any) => sum + a.allocatedQuantity,
              0,
            );
            totalBackordered += autoPlan.lineResults[0].backorderQuantity;
          }
        }
      }

      plan = {
        totalAllocated,
        totalBackordered,
        hasBackorder: lineResults.some((l) => l.backorderQuantity > 0),
        lineResults,
      };
    } else {
      // Standard automatic engine plan
      plan = this.fulfillmentEngine.calculateFulfillmentPlan(
        engineInput,
        formattedWarehouses,
        inventorySnapshots,
      );
    }

    // Execute database allocations & backorders inside Prisma transaction
    const result = await this.prisma.$transaction(async (tx) => {
      for (const lineRes of plan.lineResults) {
        // Create warehouse allocations
        for (const alloc of lineRes.allocations) {
          if (alloc.allocatedQuantity > 0) {
            await tx.fulfillmentAllocation.create({
              data: {
                quotationId: quotation.id,
                quotationLineId: lineRes.lineId,
                warehouseId: alloc.warehouseId,
                productId: lineRes.productId,
                allocatedQuantity: alloc.allocatedQuantity,
                fulfilledQuantity: 0,
                isBackorder: false,
                status: FulfillmentStatus.ALLOCATED,
              },
            });

            // Update warehouse inventory: reserve stock
            await tx.inventoryItem.update({
              where: {
                warehouseId_productId: {
                  warehouseId: alloc.warehouseId,
                  productId: lineRes.productId,
                },
              },
              data: {
                quantityReserved: { increment: alloc.allocatedQuantity },
              },
            });
          }
        }

        // Create Backorder if stock was insufficient
        if (lineRes.backorderQuantity > 0) {
          // Check if backorder already exists for this line
          const existingBackorder = await tx.backorder.findFirst({
            where: { quotationId: quotation.id, quotationLineId: lineRes.lineId },
          });

          if (existingBackorder) {
            await tx.backorder.update({
              where: { id: existingBackorder.id },
              data: {
                quantityPending: lineRes.backorderQuantity,
                status: BackorderStatus.WAITING_FOR_STOCK,
              },
            });
          } else {
            await tx.backorder.create({
              data: {
                quotationId: quotation.id,
                quotationLineId: lineRes.lineId,
                productId: lineRes.productId,
                originalQuantity: lineRes.requestedQuantity,
                quantityPending: lineRes.backorderQuantity,
                fulfilledQuantity: 0,
                status: BackorderStatus.WAITING_FOR_STOCK,
              },
            });
          }

          // Create a marker allocation record for backordered items
          await tx.fulfillmentAllocation.create({
            data: {
              quotationId: quotation.id,
              quotationLineId: lineRes.lineId,
              warehouseId: warehouses[0]?.id || quotation.id,
              productId: lineRes.productId,
              allocatedQuantity: 0,
              fulfilledQuantity: 0,
              isBackorder: true,
              status: FulfillmentStatus.BACKORDERED,
            },
          });
        }
      }

      const nextStatus = plan.hasBackorder
        ? QuotationStatus.CONFIRMED
        : QuotationStatus.FULFILLED;

      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: nextStatus },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId: quotation.id,
          userId: currentUser.id,
          action: 'FULFILLMENT_CREATED',
          reason: `Fulfillment plan executed: Allocated=${plan.totalAllocated}, Backordered=${plan.totalBackordered}`,
        },
      });

      return {
        quotationId: quotation.id,
        quoteNumber: quotation.quoteNumber,
        status: nextStatus,
        plan,
      };
    });

    this.logger.log(`[AUDIT] Fulfillment created for quotation ${quotation.quoteNumber}`);
    return result;
  }

  // --- PHYSICAL SHIPMENT / ALLOCATION PROCESSING ---

  async processAllocationShipment(allocationId: string, fulfilledQty: number, currentUser: any) {
    const allocation = await this.prisma.fulfillmentAllocation.findUnique({
      where: { id: allocationId },
      include: { quotation: true },
    });

    if (!allocation) {
      throw new NotFoundException(`Fulfillment allocation with ID '${allocationId}' not found`);
    }

    if (fulfilledQty <= 0) {
      throw new BadRequestException('Fulfilled quantity must be greater than 0');
    }

    const unfulfilledAllocated = allocation.allocatedQuantity - allocation.fulfilledQuantity;
    if (fulfilledQty > unfulfilledAllocated) {
      throw new BadRequestException(
        `Cannot fulfill ${fulfilledQty} units. Only ${unfulfilledAllocated} allocated units remaining.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Reduce physical stock and reservation in warehouse
      await tx.inventoryItem.update({
        where: {
          warehouseId_productId: {
            warehouseId: allocation.warehouseId,
            productId: allocation.productId,
          },
        },
        data: {
          quantityOnHand: { decrement: fulfilledQty },
          quantityReserved: { decrement: fulfilledQty },
        },
      });

      const newFulfilledQty = allocation.fulfilledQuantity + fulfilledQty;
      const isComplete = newFulfilledQty >= allocation.allocatedQuantity;

      const updatedAlloc = await tx.fulfillmentAllocation.update({
        where: { id: allocationId },
        data: {
          fulfilledQuantity: newFulfilledQty,
          status: isComplete ? FulfillmentStatus.FULFILLED : FulfillmentStatus.PARTIALLY_FULFILLED,
        },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId: allocation.quotationId,
          userId: currentUser.id,
          action: 'SHIPMENT_PROCESSED',
          reason: `Processed shipment of ${fulfilledQty} units from warehouse allocation '${allocationId}'`,
        },
      });

      return updatedAlloc;
    });
  }

  // --- QUERY FULFILLMENT & ALLOCATIONS ---

  async getFulfillments(currentUser: any, search?: string, status?: string) {
    // Customer restriction
    if (currentUser.role === UserRole.CUSTOMER) {
      if (!currentUser.customerId) {
        throw new ForbiddenException('User is not linked to a Customer account.');
      }
      return this.getCustomerSafeFulfillments(currentUser.customerId, search);
    }

    const where: any = {};
    if (currentUser.role === UserRole.SALES_REP) {
      where.quotation = { salesRepId: currentUser.id };
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.quotation = {
        ...where.quotation,
        quoteNumber: { contains: search.trim(), mode: 'insensitive' },
      };
    }

    const allocations = await this.prisma.fulfillmentAllocation.findMany({
      where,
      include: {
        quotation: { include: { customer: true, salesRep: true } },
        warehouse: true,
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return allocations.map((alloc) => ({
      id: alloc.id,
      quotationId: alloc.quotationId,
      quoteNumber: alloc.quotation.quoteNumber,
      customerName: alloc.quotation.customer.companyName || alloc.quotation.customer.name,
      salesRepName: alloc.quotation.salesRep.name,
      warehouseId: alloc.warehouseId,
      warehouseName: alloc.warehouse.name,
      warehouseCode: alloc.warehouse.code,
      productId: alloc.productId,
      productName: alloc.product.name,
      allocatedQuantity: alloc.allocatedQuantity,
      fulfilledQuantity: alloc.fulfilledQuantity,
      isBackorder: alloc.isBackorder,
      status: alloc.status,
      createdAt: alloc.createdAt,
    }));
  }

  private async getCustomerSafeFulfillments(customerId: string, search?: string) {
    const where: any = {
      customerId,
      status: { in: [QuotationStatus.CONFIRMED, QuotationStatus.FULFILLED] },
    };

    if (search && search.trim()) {
      where.quoteNumber = { contains: search.trim(), mode: 'insensitive' };
    }

    const quotations = await this.prisma.quotation.findMany({
      where,
      include: {
        lines: { include: { product: true } },
        fulfillmentAllocations: true,
        backorders: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return quotations.map((q) => {
      const totalRequested = q.lines.reduce((sum, l) => sum + l.quantity, 0);
      const totalFulfilled = q.fulfillmentAllocations.reduce((sum, a) => sum + a.fulfilledQuantity, 0);
      const totalBackordered = q.backorders.reduce((sum, b) => sum + b.quantityPending, 0);

      let fulfillmentLabel = 'Processing Allocation';
      if (totalFulfilled >= totalRequested && totalRequested > 0) {
        fulfillmentLabel = 'Fully Fulfilled';
      } else if (totalFulfilled > 0) {
        fulfillmentLabel = 'Partially Fulfilled';
      } else if (totalBackordered > 0) {
        fulfillmentLabel = 'Pending Stock Allocation';
      }

      return {
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        fulfillmentStatusLabel: fulfillmentLabel,
        totalRequested,
        totalFulfilled,
        totalPending: totalRequested - totalFulfilled,
        customerSafeSummary: `${totalFulfilled} of ${totalRequested} items fulfilled (${totalRequested - totalFulfilled} pending)`,
        lines: q.lines.map((l) => ({
          productName: l.product.name,
          quantity: l.quantity,
        })),
        createdAt: q.createdAt,
      };
    });
  }

  async getFulfillmentByQuotation(quotationId: string, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        salesRep: true,
        lines: { include: { product: true } },
        fulfillmentAllocations: { include: { warehouse: true, product: true } },
        backorders: { include: { product: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    // Customer security check
    if (currentUser.role === UserRole.CUSTOMER) {
      if (quotation.customerId !== currentUser.customerId) {
        throw new ForbiddenException('You do not have access to this quotation fulfillment.');
      }

      const totalRequested = quotation.lines.reduce((sum, l) => sum + l.quantity, 0);
      const totalFulfilled = quotation.fulfillmentAllocations.reduce((sum, a) => sum + a.fulfilledQuantity, 0);
      const totalBackordered = quotation.backorders.reduce((sum, b) => sum + b.quantityPending, 0);

      return {
        quotationId: quotation.id,
        quoteNumber: quotation.quoteNumber,
        status: quotation.status,
        customerSafeSummary: `${totalFulfilled} of ${totalRequested} items fulfilled (${totalRequested - totalFulfilled} pending)`,
        totalRequested,
        totalFulfilled,
        totalPending: totalRequested - totalFulfilled,
        lines: quotation.lines.map((l) => ({
          productName: l.product.name,
          quantity: l.quantity,
        })),
      };
    }

    return quotation;
  }

  // --- BACKORDER MANAGEMENT ---

  async getBackorders(currentUser: any, status?: string, search?: string) {
    const where: any = {};

    if (currentUser.role === UserRole.CUSTOMER) {
      if (!currentUser.customerId) {
        throw new ForbiddenException('User is not linked to a Customer account.');
      }
      where.quotation = { customerId: currentUser.customerId };
    } else if (currentUser.role === UserRole.SALES_REP) {
      where.quotation = { salesRepId: currentUser.id };
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { quotation: { quoteNumber: { contains: search.trim(), mode: 'insensitive' } } },
        { product: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const backorders = await this.prisma.backorder.findMany({
      where,
      include: {
        quotation: { include: { customer: true, salesRep: true } },
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return backorders.map((b) => ({
      id: b.id,
      quotationId: b.quotationId,
      quoteNumber: b.quotation.quoteNumber,
      customerName: b.quotation.customer.companyName || b.quotation.customer.name,
      productId: b.productId,
      productName: b.product.name,
      productSku: b.product.sku,
      originalQuantity: b.originalQuantity,
      quantityPending: b.quantityPending,
      fulfilledQuantity: b.fulfilledQuantity,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  }

  async fulfillBackorder(backorderId: string, dto: FulfillBackorderDto, currentUser: any) {
    const backorder = await this.prisma.backorder.findUnique({
      where: { id: backorderId },
      include: { quotation: true, product: true },
    });

    if (!backorder) {
      throw new NotFoundException(`Backorder with ID '${backorderId}' not found`);
    }

    if (backorder.status === BackorderStatus.FULFILLED || backorder.quantityPending <= 0) {
      throw new BadRequestException('This backorder has already been fully fulfilled.');
    }

    // Find target warehouse with available inventory for backorder product
    let targetWarehouseId = dto.warehouseId;
    let inventoryItem: any = null;

    if (targetWarehouseId) {
      inventoryItem = await this.prisma.inventoryItem.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: targetWarehouseId,
            productId: backorder.productId,
          },
        },
        include: { warehouse: true },
      });
    } else {
      // Auto-select active warehouse with highest available stock
      const inventoryList = await this.prisma.inventoryItem.findMany({
        where: {
          productId: backorder.productId,
          warehouse: { isActive: true },
        },
        include: { warehouse: true },
      });

      const eligible = inventoryList
        .map((inv) => ({
          ...inv,
          available: inv.quantityOnHand - inv.quantityReserved,
        }))
        .filter((inv) => inv.available > 0)
        .sort((a, b) => b.available - a.available);

      if (eligible.length === 0) {
        throw new BadRequestException(
          `No available stock in active warehouses for product '${backorder.product.name}'. Please replenish inventory first.`,
        );
      }

      inventoryItem = eligible[0];
      targetWarehouseId = eligible[0].warehouseId;
    }

    const availableStock = Math.max(
      0,
      inventoryItem.quantityOnHand - inventoryItem.quantityReserved,
    );

    if (availableStock <= 0) {
      throw new BadRequestException(
        `Warehouse '${inventoryItem.warehouse?.name || targetWarehouseId}' has 0 available stock for product '${backorder.product.name}'.`,
      );
    }

    const requestedFulfillQty = dto.quantity || backorder.quantityPending;
    const qtyToFulfill = Math.min(requestedFulfillQty, Math.min(backorder.quantityPending, availableStock));

    if (qtyToFulfill <= 0) {
      throw new BadRequestException('Invalid backorder fulfillment quantity.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct stock directly from warehouse inventory
      await tx.inventoryItem.update({
        where: {
          warehouseId_productId: {
            warehouseId: targetWarehouseId!,
            productId: backorder.productId,
          },
        },
        data: {
          quantityOnHand: { decrement: qtyToFulfill },
        },
      });

      const newPending = backorder.quantityPending - qtyToFulfill;
      const newFulfilled = backorder.fulfilledQuantity + qtyToFulfill;
      const isComplete = newPending <= 0;

      const updatedBackorder = await tx.backorder.update({
        where: { id: backorderId },
        data: {
          quantityPending: newPending,
          fulfilledQuantity: newFulfilled,
          status: isComplete ? BackorderStatus.FULFILLED : BackorderStatus.PARTIALLY_FULFILLED,
        },
      });

      // Create allocation record for the fulfilled backorder
      await tx.fulfillmentAllocation.create({
        data: {
          quotationId: backorder.quotationId,
          quotationLineId: backorder.quotationLineId,
          warehouseId: targetWarehouseId!,
          productId: backorder.productId,
          allocatedQuantity: qtyToFulfill,
          fulfilledQuantity: qtyToFulfill,
          isBackorder: true,
          status: FulfillmentStatus.FULFILLED,
        },
      });

      // Check if all backorders for this quotation are completed -> mark quotation FULFILLED
      const remainingBackorders = await tx.backorder.count({
        where: {
          quotationId: backorder.quotationId,
          status: { notIn: [BackorderStatus.FULFILLED, BackorderStatus.CANCELLED] },
        },
      });

      if (remainingBackorders === 0) {
        await tx.quotation.update({
          where: { id: backorder.quotationId },
          data: { status: QuotationStatus.FULFILLED },
        });
      }

      await tx.quotationAuditLog.create({
        data: {
          quotationId: backorder.quotationId,
          userId: currentUser.id,
          action: 'BACKORDER_FULFILLED',
          reason: `Fulfilled ${qtyToFulfill} backordered units of '${backorder.product.name}' from warehouse '${inventoryItem.warehouse?.name || targetWarehouseId}'`,
        },
      });

      return updatedBackorder;
    });

    // Fire-and-forget deal health recalculation (quotationId captured before tx)
    const quotationIdForHealthCheck = backorder!.quotationId;
    this.dealHealthService
      .recalculateQuotationHealth(quotationIdForHealthCheck)
      .catch((e) => this.logger.error('Deal health recalculation failed after backorder fulfillment', e));
  }

  // --- WAREHOUSE & INVENTORY MANAGEMENT ---

  async getWarehouses() {
    return this.prisma.warehouse.findMany({
      include: {
        _count: { select: { inventoryItems: true, allocations: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });

    if (existing) {
      throw new ConflictException('Warehouse with this name or code already exists.');
    }

    return this.prisma.warehouse.create({
      data: {
        name: dto.name,
        code: dto.code,
        location: dto.location,
        shippingCostWeighting: dto.shippingCostWeighting || 1.0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID '${id}' not found`);
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
  }

  async getInventory(warehouseId?: string, search?: string) {
    const where: any = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (search && search.trim()) {
      where.product = {
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { sku: { contains: search.trim(), mode: 'insensitive' } },
        ],
      };
    }

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      warehouseCode: item.warehouse.code,
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      quantityOnHand: item.quantityOnHand,
      quantityReserved: item.quantityReserved,
      availableQuantity: Math.max(0, item.quantityOnHand - item.quantityReserved),
      reorderLevel: item.reorderLevel,
      updatedAt: item.updatedAt,
    }));
  }

  async updateInventory(dto: UpdateInventoryDto) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID '${dto.warehouseId}' not found`);
    }

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID '${dto.productId}' not found`);
    }

    const reserved = dto.quantityReserved !== undefined ? dto.quantityReserved : 0;
    if (dto.quantityOnHand < reserved) {
      throw new BadRequestException(
        `Quantity on hand (${dto.quantityOnHand}) cannot be less than reserved quantity (${reserved}).`,
      );
    }

    return this.prisma.inventoryItem.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
        },
      },
      create: {
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        quantityOnHand: dto.quantityOnHand,
        quantityReserved: reserved,
        reorderLevel: dto.reorderLevel || 10,
      },
      update: {
        quantityOnHand: dto.quantityOnHand,
        quantityReserved: reserved,
        reorderLevel: dto.reorderLevel,
      },
    });
  }

  // --- INVENTORY ADJUSTMENT (INCREASE / DECREASE / SET) ---

  async adjustInventory(inventoryItemId: string, dto: AdjustInventoryDto, currentUser: any) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { warehouse: true, product: true },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID '${inventoryItemId}' not found`);
    }

    const previousQuantity = item.quantityOnHand;
    let newQuantity: number;

    switch (dto.type) {
      case InventoryAdjustmentType.INCREASE:
        newQuantity = previousQuantity + dto.quantity;
        break;

      case InventoryAdjustmentType.DECREASE:
        newQuantity = previousQuantity - dto.quantity;
        if (newQuantity < 0) {
          throw new BadRequestException(
            `Cannot decrease stock by ${dto.quantity}. Current on-hand is ${previousQuantity} for product '${item.product.name}' at '${item.warehouse.name}'. Operation would result in negative stock.`,
          );
        }
        // Also check that new quantity doesn't go below reserved
        if (newQuantity < item.quantityReserved) {
          throw new BadRequestException(
            `Cannot decrease stock to ${newQuantity} because ${item.quantityReserved} units are already reserved for fulfillment. Free up reservations first.`,
          );
        }
        break;

      case InventoryAdjustmentType.SET:
        newQuantity = dto.quantity;
        if (newQuantity < 0) {
          throw new BadRequestException('Cannot set stock to a negative value.');
        }
        if (newQuantity < item.quantityReserved) {
          throw new BadRequestException(
            `Cannot set stock to ${newQuantity} because ${item.quantityReserved} units are reserved. Resolve reservations first or increase the set quantity.`,
          );
        }
        break;

      default:
        throw new BadRequestException('Invalid adjustment type.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityOnHand: newQuantity },
        include: { warehouse: true, product: true },
      });

      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          inventoryItemId: item.id,
          productId: item.productId,
          warehouseId: item.warehouseId,
          userId: currentUser?.id || null,
          type: dto.type,
          quantity: dto.quantity,
          previousQuantity,
          newQuantity,
          reason: dto.reason || null,
        },
        include: { user: { select: { id: true, name: true, role: true } } },
      });

      this.logger.log(
        `[INVENTORY] ${dto.type} by ${dto.quantity} for product '${item.product.name}' ` +
          `at '${item.warehouse.code}' | ${previousQuantity} → ${newQuantity} ` +
          `(by user: ${currentUser?.name || 'system'})`,
      );

      return {
        id: updated.id,
        warehouseId: updated.warehouseId,
        warehouseName: updated.warehouse.name,
        warehouseCode: updated.warehouse.code,
        productId: updated.productId,
        productName: updated.product.name,
        productSku: updated.product.sku,
        quantityOnHand: updated.quantityOnHand,
        quantityReserved: updated.quantityReserved,
        availableQuantity: Math.max(0, updated.quantityOnHand - updated.quantityReserved),
        reorderLevel: updated.reorderLevel,
        adjustment: {
          id: adjustment.id,
          type: adjustment.type,
          quantity: adjustment.quantity,
          previousQuantity: adjustment.previousQuantity,
          newQuantity: adjustment.newQuantity,
          reason: adjustment.reason,
          adjustedBy: adjustment.user?.name || 'System',
          createdAt: adjustment.createdAt,
        },
        updatedAt: updated.updatedAt,
      };
    });
  }

  async getInventoryAdjustments(inventoryItemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID '${inventoryItemId}' not found`);
    }

    const adjustments = await this.prisma.inventoryAdjustment.findMany({
      where: { inventoryItemId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return adjustments.map((a) => ({
      id: a.id,
      type: a.type,
      quantity: a.quantity,
      previousQuantity: a.previousQuantity,
      newQuantity: a.newQuantity,
      reason: a.reason,
      adjustedBy: a.user?.name || 'System',
      adjustedByRole: a.user?.role,
      createdAt: a.createdAt,
    }));
  }
}

