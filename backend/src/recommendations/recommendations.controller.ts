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
import { RecommendationsService } from './recommendations.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { QueryRecommendationsDto } from './dto/query-recommendations.dto';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  async findAll(@Query() query: QueryRecommendationsDto) {
    return this.recommendationsService.findAll(query);
  }

  @Get('quotation/:quotationId')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  async getQuotationRecommendations(@Param('quotationId') quotationId: string, @Req() req: any) {
    return this.recommendationsService.getRecommendationsForQuotation(quotationId, req.user);
  }

  @Post('quotation/:quotationId/add/:productId')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  @HttpCode(HttpStatus.OK)
  async addQuotationRecommendation(
    @Param('quotationId') quotationId: string,
    @Param('productId') productId: string,
    @Req() req: any,
  ) {
    return this.recommendationsService.addRecommendationToQuotation(quotationId, productId, req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER)
  async findOne(@Param('id') id: string) {
    return this.recommendationsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRecommendationDto, @Req() req: any) {
    return this.recommendationsService.create(dto, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateRecommendationDto, @Req() req: any) {
    return this.recommendationsService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleStatus(@Param('id') id: string, @Req() req: any) {
    return this.recommendationsService.toggleStatus(id, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.recommendationsService.remove(id, req.user);
  }
}
