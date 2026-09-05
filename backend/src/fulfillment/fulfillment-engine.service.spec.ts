import { FulfillmentEngineService, WarehouseItem, InventoryItemSnapshot, FulfillmentLineInput } from './fulfillment-engine.service';

describe('FulfillmentEngineService (Unit Tests)', () => {
  let engine: FulfillmentEngineService;

  beforeEach(() => {
    engine = new FulfillmentEngineService();
  });

  const sampleWarehouses: WarehouseItem[] = [
    { id: 'wh-a', name: 'Main Warehouse', code: 'WH-A', location: 'NY', shippingCostWeighting: 1.0, isActive: true },
    { id: 'wh-b', name: 'West Regional Hub', code: 'WH-B', location: 'LA', shippingCostWeighting: 1.2, isActive: true },
    { id: 'wh-c', name: 'East Regional Hub', code: 'WH-C', location: 'CHI', shippingCostWeighting: 1.1, isActive: true },
    { id: 'wh-inact', name: 'Inactive Hub', code: 'WH-INACT', location: 'TEX', shippingCostWeighting: 0.5, isActive: false },
  ];

  it('1. should fulfill entire quantity from single warehouse if stock is sufficient', () => {
    const lineItems: FulfillmentLineInput[] = [
      { lineId: 'line-1', productId: 'prod-laptop', requestedQuantity: 5 },
    ];
    const inventory: InventoryItemSnapshot[] = [
      { warehouseId: 'wh-a', productId: 'prod-laptop', quantityOnHand: 10, quantityReserved: 0 },
    ];

    const result = engine.calculateFulfillmentPlan(lineItems, sampleWarehouses, inventory);

    expect(result.isFullyAllocated).toBe(true);
    expect(result.totalAllocated).toBe(5);
    expect(result.totalBackordered).toBe(0);
    expect(result.lineResults[0].allocations).toEqual([
      { warehouseId: 'wh-a', allocatedQuantity: 5 },
    ]);
  });

  it('2. should split quantity across multiple warehouses deterministically', () => {
    const lineItems: FulfillmentLineInput[] = [
      { lineId: 'line-1', productId: 'prod-laptop', requestedQuantity: 10 },
    ];
    // WH-A has 6, WH-C (weight 1.1) has 4, WH-B (weight 1.2) has 5
    const inventory: InventoryItemSnapshot[] = [
      { warehouseId: 'wh-a', productId: 'prod-laptop', quantityOnHand: 6, quantityReserved: 0 },
      { warehouseId: 'wh-b', productId: 'prod-laptop', quantityOnHand: 5, quantityReserved: 0 },
      { warehouseId: 'wh-c', productId: 'prod-laptop', quantityOnHand: 4, quantityReserved: 0 },
    ];

    const result = engine.calculateFulfillmentPlan(lineItems, sampleWarehouses, inventory);

    expect(result.isFullyAllocated).toBe(true);
    expect(result.totalAllocated).toBe(10);
    expect(result.totalBackordered).toBe(0);
    // Deterministic order by weight: WH-A (1.0) -> 6, WH-C (1.1) -> 4
    expect(result.lineResults[0].allocations).toEqual([
      { warehouseId: 'wh-a', allocatedQuantity: 6 },
      { warehouseId: 'wh-c', allocatedQuantity: 4 },
    ]);
  });

  it('3. should create backorder when total warehouse stock is insufficient', () => {
    const lineItems: FulfillmentLineInput[] = [
      { lineId: 'line-1', productId: 'prod-laptop', requestedQuantity: 15 },
    ];
    const inventory: InventoryItemSnapshot[] = [
      { warehouseId: 'wh-a', productId: 'prod-laptop', quantityOnHand: 6, quantityReserved: 0 },
      { warehouseId: 'wh-b', productId: 'prod-laptop', quantityOnHand: 4, quantityReserved: 0 },
      { warehouseId: 'wh-c', productId: 'prod-laptop', quantityOnHand: 2, quantityReserved: 0 },
    ];

    const result = engine.calculateFulfillmentPlan(lineItems, sampleWarehouses, inventory);

    expect(result.isFullyAllocated).toBe(false);
    expect(result.hasBackorder).toBe(true);
    expect(result.totalAllocated).toBe(12);
    expect(result.totalBackordered).toBe(3);
    expect(result.lineResults[0].backorderQuantity).toBe(3);
  });

  it('4. should ignore inactive warehouses', () => {
    const lineItems: FulfillmentLineInput[] = [
      { lineId: 'line-1', productId: 'prod-laptop', requestedQuantity: 5 },
    ];
    // WH-INACT has 100 stock but is inactive
    const inventory: InventoryItemSnapshot[] = [
      { warehouseId: 'wh-inact', productId: 'prod-laptop', quantityOnHand: 100, quantityReserved: 0 },
      { warehouseId: 'wh-a', productId: 'prod-laptop', quantityOnHand: 2, quantityReserved: 0 },
    ];

    const result = engine.calculateFulfillmentPlan(lineItems, sampleWarehouses, inventory);

    expect(result.totalAllocated).toBe(2);
    expect(result.totalBackordered).toBe(3);
    expect(result.lineResults[0].allocations).toEqual([
      { warehouseId: 'wh-a', allocatedQuantity: 2 },
    ]);
  });

  it('5. should subtract reservedQuantity from quantityOnHand when calculating available stock', () => {
    const lineItems: FulfillmentLineInput[] = [
      { lineId: 'line-1', productId: 'prod-laptop', requestedQuantity: 5 },
    ];
    // WH-A has 10 on hand, but 8 are already reserved -> available = 2
    const inventory: InventoryItemSnapshot[] = [
      { warehouseId: 'wh-a', productId: 'prod-laptop', quantityOnHand: 10, quantityReserved: 8 },
      { warehouseId: 'wh-b', productId: 'prod-laptop', quantityOnHand: 5, quantityReserved: 0 },
    ];

    const result = engine.calculateFulfillmentPlan(lineItems, sampleWarehouses, inventory);

    expect(result.totalAllocated).toBe(5);
    expect(result.lineResults[0].allocations).toEqual([
      { warehouseId: 'wh-a', allocatedQuantity: 2 },
      { warehouseId: 'wh-c', allocatedQuantity: 0 }, // WH-C sorted before WH-B by weight
      { warehouseId: 'wh-b', allocatedQuantity: 3 },
    ].filter((a) => a.allocatedQuantity > 0));
  });

  it('6. should account for alreadyAllocatedQuantity and only fulfill remaining needed amount', () => {
    const lineItems: FulfillmentLineInput[] = [
      { lineId: 'line-1', productId: 'prod-laptop', requestedQuantity: 10, alreadyAllocatedQuantity: 6 },
    ];
    const inventory: InventoryItemSnapshot[] = [
      { warehouseId: 'wh-a', productId: 'prod-laptop', quantityOnHand: 10, quantityReserved: 0 },
    ];

    const result = engine.calculateFulfillmentPlan(lineItems, sampleWarehouses, inventory);

    expect(result.totalAllocated).toBe(4);
    expect(result.lineResults[0].allocatedTotal).toBe(4);
    expect(result.lineResults[0].backorderQuantity).toBe(0);
  });
});
