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
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApprovalChainsService } from './approval-chains.service';
import { CreateApprovalChainDto } from './dto/create-approval-chain.dto';
import { UpdateApprovalChainDto } from './dto/update-approval-chain.dto';

@Controller('approval-chains')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalChainsController {
  constructor(private readonly approvalChainsService: ApprovalChainsService) {}

  @Get()
  async findAll() {
    return this.approvalChainsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.approvalChainsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateApprovalChainDto) {
    return this.approvalChainsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateApprovalChainDto) {
    return this.approvalChainsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.approvalChainsService.remove(id);
  }
}
