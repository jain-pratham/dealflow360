import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { FulfillmentService } from './fulfillment.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { FulfillBackorderDto } from './dto/fulfill-backorder.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  // --- FULFILLMENT & MULTI-WAREHOUSE ALLOCATION ENDPOINTS ---

  @Post('fulfillment/quotation/:quotationId')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE)
  @HttpCode(HttpStatus.OK)
  async createFulfillment(
    @Param('quotationId') quotationId: string,
    @Body() body: any,
    @GetUser() currentUser: any,
  ) {
    return this.fulfillmentService.createFulfillmentForQuotation(
      quotationId,
      currentUser,
      body?.manualAllocations,
    );
  }

  @Post('fulfillment/allocation/:allocationId/ship')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  @HttpCode(HttpStatus.OK)
  async processAllocationShipment(
    @Param('allocationId') allocationId: string,
    @Body('fulfilledQuantity') fulfilledQuantity: number,
    @GetUser() currentUser: any,
  ) {
    return this.fulfillmentService.processAllocationShipment(
      allocationId,
      fulfilledQuantity || 1,
      currentUser,
    );
  }

  @Get('fulfillment')
  async getFulfillments(
    @GetUser() currentUser: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.fulfillmentService.getFulfillments(currentUser, search, status);
  }

  @Get('fulfillment/quotation/:quotationId')
  async getFulfillmentByQuotation(
    @Param('quotationId') quotationId: string,
    @GetUser() currentUser: any,
  ) {
    return this.fulfillmentService.getFulfillmentByQuotation(quotationId, currentUser);
  }

  @Get('fulfillment/:id')
  async getFulfillmentById(@Param('id') id: string, @GetUser() currentUser: any) {
    return this.fulfillmentService.getFulfillmentByQuotation(id, currentUser);
  }

  // --- BACKORDER ENDPOINTS ---

  @Get('backorders')
  async getBackorders(
    @GetUser() currentUser: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.fulfillmentService.getBackorders(currentUser, status, search);
  }

  @Post('backorders/:id/fulfill')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  @HttpCode(HttpStatus.OK)
  async fulfillBackorder(
    @Param('id') id: string,
    @Body() dto: FulfillBackorderDto,
    @GetUser() currentUser: any,
  ) {
    return this.fulfillmentService.fulfillBackorder(id, dto, currentUser);
  }

  // --- WAREHOUSE MANAGEMENT ENDPOINTS ---

  @Get('warehouses')
  async getWarehouses() {
    return this.fulfillmentService.getWarehouses();
  }

  @Post('warehouses')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.fulfillmentService.createWarehouse(dto);
  }

  @Patch('warehouses/:id')
  @Roles(UserRole.ADMIN)
  async updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.fulfillmentService.updateWarehouse(id, dto);
  }

  // --- INVENTORY MANAGEMENT ENDPOINTS ---

  @Get('inventory')
  @Roles(
    UserRole.ADMIN,
    UserRole.FINANCE,
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
  )
  async getInventory(
    @Query('warehouseId') warehouseId?: string,
    @Query('search') search?: string,
  ) {
    return this.fulfillmentService.getInventory(warehouseId, search);
  }

  @Get('warehouses/:warehouseId/inventory')
  @Roles(
    UserRole.ADMIN,
    UserRole.FINANCE,
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
  )
  async getWarehouseInventory(
    @Param('warehouseId') warehouseId: string,
    @Query('search') search?: string,
  ) {
    return this.fulfillmentService.getInventory(warehouseId, search);
  }

  @Patch('inventory')
  @Roles(UserRole.ADMIN)
  async updateInventory(@Body() dto: UpdateInventoryDto) {
    return this.fulfillmentService.updateInventory(dto);
  }

  @Post('inventory/:inventoryItemId/adjust')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  @HttpCode(HttpStatus.OK)
  async adjustInventory(
    @Param('inventoryItemId') inventoryItemId: string,
    @Body() dto: AdjustInventoryDto,
    @GetUser() currentUser: any,
  ) {
    return this.fulfillmentService.adjustInventory(inventoryItemId, dto, currentUser);
  }

  @Get('inventory/:inventoryItemId/adjustments')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  async getInventoryAdjustments(
    @Param('inventoryItemId') inventoryItemId: string,
  ) {
    return this.fulfillmentService.getInventoryAdjustments(inventoryItemId);
  }
}
