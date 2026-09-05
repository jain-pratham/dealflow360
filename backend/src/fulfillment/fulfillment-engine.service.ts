import { Injectable, Logger } from '@nestjs/common';

export interface FulfillmentLineInput {
  lineId: string;
  productId: string;
  requestedQuantity: number;
  alreadyAllocatedQuantity?: number;
}

export interface WarehouseItem {
  id: string;
  name: string;
  code?: string | null;
  location: string;
  shippingCostWeighting: number | string;
  isActive: boolean;
}

export interface InventoryItemSnapshot {
  warehouseId: string;
  productId: string;
  quantityOnHand: number;
  quantityReserved: number;
}

export interface WarehouseAllocationItem {
  warehouseId: string;
  allocatedQuantity: number;
}

export interface LineAllocationResult {
  lineId: string;
  productId: string;
  requestedQuantity: number;
  alreadyAllocated: number;
  allocatedTotal: number;
  backorderQuantity: number;
  allocations: WarehouseAllocationItem[];
}

export interface FulfillmentPlanResult {
  lineResults: LineAllocationResult[];
  totalAllocated: number;
  totalBackordered: number;
  isFullyAllocated: boolean;
  hasBackorder: boolean;
}

@Injectable()
export class FulfillmentEngineService {
  private readonly logger = new Logger(FulfillmentEngineService.name);

  /**
   * Deterministically calculates multi-warehouse stock allocations & backorders.
   */
  calculateFulfillmentPlan(
    lineItems: FulfillmentLineInput[],
    warehouses: WarehouseItem[],
    inventorySnapshots: InventoryItemSnapshot[],
  ): FulfillmentPlanResult {
    // 1. Filter only active warehouses
    const activeWarehouses = warehouses.filter((w) => w.isActive);

    // 2. Sort warehouses deterministically (shippingCostWeighting asc, code asc, name asc)
    const sortedWarehouses = [...activeWarehouses].sort((a, b) => {
      const weightA = Number(a.shippingCostWeighting);
      const weightB = Number(b.shippingCostWeighting);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      const codeA = a.code || a.name;
      const codeB = b.code || b.name;
      return codeA.localeCompare(codeB);
    });

    // Deep copy inventory state so in-memory allocations track remaining stock during calculation
    const inventoryMap = new Map<string, { quantityOnHand: number; quantityReserved: number }>();
    inventorySnapshots.forEach((inv) => {
      const key = `${inv.warehouseId}_${inv.productId}`;
      inventoryMap.set(key, {
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
      });
    });

    const lineResults: LineAllocationResult[] = [];
    let totalAllocatedSum = 0;
    let totalBackorderSum = 0;

    // 3. Evaluate each quotation line item
    for (const line of lineItems) {
      const alreadyAllocated = line.alreadyAllocatedQuantity || 0;
      let neededQty = Math.max(0, line.requestedQuantity - alreadyAllocated);

      const allocations: WarehouseAllocationItem[] = [];
      let currentAllocatedForLine = 0;

      if (neededQty > 0) {
        for (const wh of sortedWarehouses) {
          const key = `${wh.id}_${line.productId}`;
          const inv = inventoryMap.get(key);

          if (inv) {
            const availableStock = Math.max(0, inv.quantityOnHand - inv.quantityReserved);
            if (availableStock > 0) {
              const allocQty = Math.min(neededQty, availableStock);

              allocations.push({
                warehouseId: wh.id,
                allocatedQuantity: allocQty,
              });

              // Reserve stock in temporary inventory state
              inv.quantityReserved += allocQty;
              currentAllocatedForLine += allocQty;
              neededQty -= allocQty;

              if (neededQty <= 0) {
                break;
              }
            }
          }
        }
      }

      const backorderQty = neededQty;

      totalAllocatedSum += currentAllocatedForLine;
      totalBackorderSum += backorderQty;

      lineResults.push({
        lineId: line.lineId,
        productId: line.productId,
        requestedQuantity: line.requestedQuantity,
        alreadyAllocated,
        allocatedTotal: currentAllocatedForLine,
        backorderQuantity: backorderQty,
        allocations,
      });
    }

    const isFullyAllocated = totalBackorderSum === 0;
    const hasBackorder = totalBackorderSum > 0;

    this.logger.log(
      `[FULFILLMENT ENGINE] Calculated plan for ${lineItems.length} items: Allocated=${totalAllocatedSum}, Backordered=${totalBackorderSum}`,
    );

    return {
      lineResults,
      totalAllocated: totalAllocatedSum,
      totalBackordered: totalBackorderSum,
      isFullyAllocated,
      hasBackorder,
    };
  }
}
