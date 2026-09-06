import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRoleRequired } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalChainDto } from './dto/create-approval-chain.dto';
import { UpdateApprovalChainDto } from './dto/update-approval-chain.dto';

@Injectable()
export class ApprovalChainsService {
  private readonly logger = new Logger(ApprovalChainsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.approvalChain.findMany({
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const chain = await this.prisma.approvalChain.findUnique({
      where: { id },
    });

    if (!chain) {
      throw new NotFoundException(`Approval chain with ID '${id}' not found`);
    }

    return chain;
  }

  async create(dto: CreateApprovalChainDto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Approval chain name cannot be empty');
    }

    if (dto.sequence < 1) {
      throw new BadRequestException('Sequence must be at least 1');
    }

    const isActive = dto.isActive !== undefined ? dto.isActive : true;

    const created = await this.prisma.approvalChain.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        requiredRole: dto.requiredRole,
        sequence: dto.sequence,
        isActive,
      },
    });

    this.logger.log(`[AUDIT] Created Approval Chain: ID=${created.id}, Name=${created.name}`);
    return created;
  }

  async update(id: string, dto: UpdateApprovalChainDto) {
    const existing = await this.prisma.approvalChain.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Approval chain with ID '${id}' not found`);
    }

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    if (!name) {
      throw new BadRequestException('Approval chain name cannot be empty');
    }

    const sequence = dto.sequence !== undefined ? dto.sequence : existing.sequence;
    if (sequence < 1) {
      throw new BadRequestException('Sequence must be at least 1');
    }

    const isActive = dto.isActive !== undefined ? dto.isActive : existing.isActive;

    const updated = await this.prisma.approvalChain.update({
      where: { id },
      data: {
        name,
        description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : existing.description,
        ...(dto.requiredRole && { requiredRole: dto.requiredRole }),
        sequence,
        isActive,
      },
    });

    this.logger.log(`[AUDIT] Updated Approval Chain: ID=${id}, Name=${updated.name}`);
    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.approvalChain.findUnique({
      where: { id },
      include: {
        _count: {
          select: { approvalRequests: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Approval chain with ID '${id}' not found`);
    }

    if (existing._count.approvalRequests > 0) {
      throw new BadRequestException(
        `Cannot delete approval chain '${existing.name}' because it is referenced by ${existing._count.approvalRequests} existing approval requests. Deactivate the chain instead to preserve historical audit logs.`,
      );
    }

    await this.prisma.approvalChain.delete({
      where: { id },
    });

    this.logger.log(`[AUDIT] Deleted Approval Chain: ID=${id}`);
    return { message: 'Approval chain deleted successfully' };
  }

  async findActiveChainForRole(role: ApprovalRoleRequired) {
    return this.prisma.approvalChain.findFirst({
      where: {
        requiredRole: role,
        isActive: true,
      },
      orderBy: { sequence: 'asc' },
    });
  }
}
