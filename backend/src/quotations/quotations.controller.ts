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
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { AddQuotationLineDto } from './dto/add-quotation-line.dto';
import { UpdateQuotationLineDto } from './dto/update-quotation-line.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';

@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async findAll(@Query() query: QueryQuotationsDto, @Req() req: any) {
    return this.quotationsService.findAll(query, req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateQuotationDto, @Req() req: any) {
    return this.quotationsService.create(dto, req.user);
  }

  @Post(':id/lines')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async addLine(
    @Param('id') id: string,
    @Body() dto: AddQuotationLineDto,
    @Req() req: any,
  ) {
    return this.quotationsService.addLine(id, dto, req.user);
  }

  @Patch(':id/lines/:lineId')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.OK)
  async updateLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateQuotationLineDto,
    @Req() req: any,
  ) {
    return this.quotationsService.updateLine(id, lineId, dto, req.user);
  }

  @Delete(':id/lines/:lineId')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.OK)
  async removeLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Req() req: any,
  ) {
    return this.quotationsService.removeLine(id, lineId, req.user);
  }

  @Post(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id') id: string, @Req() req: any) {
    return this.quotationsService.submit(id, req.user);
  }

  @Post(':id/send')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.OK)
  async send(@Param('id') id: string, @Req() req: any) {
    return this.quotationsService.send(id, req.user);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.quotationsService.cancel(id, req.user);
  }
}
