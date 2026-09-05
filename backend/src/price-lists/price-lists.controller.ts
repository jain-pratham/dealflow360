import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerTier, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { AddPriceListItemDto } from './dto/add-price-list-item.dto';
import { UpdatePriceListItemDto } from './dto/update-price-list-item.dto';
import { QueryPriceListsDto } from './dto/query-price-lists.dto';

@Controller('price-lists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Get()
  async findAll(@Query() query: QueryPriceListsDto) {
    return this.priceListsService.findAll(query);
  }

  @Get('resolve-price')
  async resolvePrice(
    @Query('productId') productId: string,
    @Query('customerTier') customerTier: CustomerTier,
    @Query('currency') currency?: string,
  ) {
    return this.priceListsService.resolveProductPrice(productId, customerTier, currency);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.priceListsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePriceListDto) {
    return this.priceListsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    return this.priceListsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async setStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.priceListsService.setStatus(id, Boolean(isActive));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.priceListsService.remove(id);
  }

  // --- Price List Items Endpoints ---

  @Post(':id/items')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addItem(@Param('id') id: string, @Body() dto: AddPriceListItemDto) {
    return this.priceListsService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePriceListItemDto,
  ) {
    return this.priceListsService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.priceListsService.removeItem(id, itemId);
  }
}
