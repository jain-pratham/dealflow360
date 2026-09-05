import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRoleRequired, ApprovalStatus, QuotationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private transformApprovalRequest(ar: any) {
    return {
      id: ar.id,
      quotationId: ar.quotationId,
      requiredRole: ar.requiredRole,
      requestedDiscount: ar.requestedDiscount ? Number(ar.requestedDiscount) : undefined,
      status: ar.status,
      reviewerId: ar.reviewerId,
      comments: ar.comments,
      createdAt: ar.createdAt,
      evaluatedAt: ar.evaluatedAt,
      quotation: ar.quotation
        ? {
            id: ar.quotation.id,
            quoteNumber: ar.quotation.quoteNumber,
            status: ar.quotation.status,
            totalAmount: Number(ar.quotation.totalAmount),
            currency: ar.quotation.currency,
            customer: ar.quotation.customer
              ? {
                  id: ar.quotation.customer.id,
                  companyName: ar.quotation.customer.companyName,
                  tier: ar.quotation.customer.tier,
                }
              : undefined,
            salesRep: ar.quotation.salesRep
              ? {
                  id: ar.quotation.salesRep.id,
                  name: ar.quotation.salesRep.name,
                  email: ar.quotation.salesRep.email,
                }
              : undefined,
          }
        : undefined,
      reviewer: ar.reviewer
        ? {
            id: ar.reviewer.id,
            name: ar.reviewer.name,
            email: ar.reviewer.email,
          }
        : undefined,
    };
  }

  async getApprovalQueue(currentUser: any) {
    const where: any = {};

    if (currentUser.role === UserRole.SALES_MANAGER) {
      where.requiredRole = ApprovalRoleRequired.SALES_MANAGER;
    } else if (currentUser.role === UserRole.FINANCE) {
      where.requiredRole = ApprovalRoleRequired.FINANCE;
    } else if (currentUser.role === UserRole.SALES_REP) {
      where.quotation = { salesRepId: currentUser.id };
    }

    const items = await this.prisma.approvalRequest.findMany({
      where,
      include: {
        quotation: {
          include: {
            customer: true,
            salesRep: true,
          },
        },
        reviewer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((ar) => this.transformApprovalRequest(ar));
  }

  async findOne(id: string) {
    const ar = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        quotation: {
          include: {
            customer: true,
            salesRep: true,
            lines: { include: { product: true } },
          },
        },
        reviewer: true,
      },
    });

    if (!ar) {
      throw new NotFoundException(`Approval request with ID '${id}' not found`);
    }

    return this.transformApprovalRequest(ar);
  }

  async approve(id: string, comments: string | undefined, currentUser: any) {
    const ar = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { quotation: true },
    });

    if (!ar) {
      throw new NotFoundException(`Approval request with ID '${id}' not found`);
    }

    // RBAC: Check role matches requiredRole or ADMIN
    const isAuthorized =
      currentUser.role === UserRole.ADMIN ||
      (ar.requiredRole === ApprovalRoleRequired.SALES_MANAGER &&
        currentUser.role === UserRole.SALES_MANAGER) ||
      (ar.requiredRole === ApprovalRoleRequired.FINANCE && currentUser.role === UserRole.FINANCE);

    if (!isAuthorized) {
      throw new ForbiddenException(
        `User role '${currentUser.role}' is not authorized to approve '${ar.requiredRole}' requests`,
      );
    }

    // Safety: A pure Sales Rep cannot approve their own request
    if (ar.quotation.salesRepId === currentUser.id && currentUser.role === UserRole.SALES_REP) {
      throw new ForbiddenException('Sales Rep cannot approve their own quotation approval request');
    }

    // Concurrency / State Safety
    if (ar.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(`Approval request is already in status '${ar.status}'`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAr = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          reviewerId: currentUser.id,
          comments: comments?.trim() || 'Approved',
        },
      });

      await tx.quotation.update({
        where: { id: ar.quotationId },
        data: { status: QuotationStatus.APPROVED },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId: ar.quotationId,
          userId: currentUser.id,
          action: ar.requiredRole === ApprovalRoleRequired.FINANCE ? 'FINANCE_APPROVED' : 'MANAGER_APPROVED',
          reason: comments?.trim() || `Approved by ${currentUser.name}`,
        },
      });

      return updatedAr;
    });

    this.logger.log(`[AUDIT] Approval request ${id} APPROVED by ${currentUser.name}`);

    return this.findOne(id);
  }

  async reject(id: string, comments: string | undefined, currentUser: any) {
    const ar = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { quotation: true },
    });

    if (!ar) {
      throw new NotFoundException(`Approval request with ID '${id}' not found`);
    }

    const isAuthorized =
      currentUser.role === UserRole.ADMIN ||
      (ar.requiredRole === ApprovalRoleRequired.SALES_MANAGER &&
        currentUser.role === UserRole.SALES_MANAGER) ||
      (ar.requiredRole === ApprovalRoleRequired.FINANCE && currentUser.role === UserRole.FINANCE);

    if (!isAuthorized) {
      throw new ForbiddenException(
        `User role '${currentUser.role}' is not authorized to reject '${ar.requiredRole}' requests`,
      );
    }

    if (ar.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(`Approval request is already in status '${ar.status}'`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAr = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          reviewerId: currentUser.id,
          comments: comments?.trim() || 'Rejected',
        },
      });

      await tx.quotation.update({
        where: { id: ar.quotationId },
        data: { status: QuotationStatus.REJECTED },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId: ar.quotationId,
          userId: currentUser.id,
          action: 'REJECTED',
          reason: comments?.trim() || `Rejected by ${currentUser.name}`,
        },
      });

      return updatedAr;
    });

    this.logger.log(`[AUDIT] Approval request ${id} REJECTED by ${currentUser.name}`);

    return this.findOne(id);
  }
}
