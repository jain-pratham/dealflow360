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
import { CustomerTier, ProductType, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DiscountRulesService } from './discount-rules.service';
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';
import { UpdateDiscountRuleDto } from './dto/update-discount-rule.dto';
import { QueryDiscountRulesDto } from './dto/query-discount-rules.dto';

@Controller('discount-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountRulesController {
  constructor(private readonly discountRulesService: DiscountRulesService) {}

  @Get()
  async findAll(@Query() query: QueryDiscountRulesDto) {
    return this.discountRulesService.findAll(query);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluate(
    @Body('customerTier') customerTier: CustomerTier,
    @Body('productCategory') productCategory: ProductType,
    @Body('discountPercent') discountPercent: number,
  ) {
    return this.discountRulesService.evaluateDiscount(
      customerTier,
      productCategory,
      Number(discountPercent || 0),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.discountRulesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDiscountRuleDto) {
    return this.discountRulesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateDiscountRuleDto) {
    return this.discountRulesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async setStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.discountRulesService.setStatus(id, Boolean(isActive));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.discountRulesService.remove(id);
  }
}
