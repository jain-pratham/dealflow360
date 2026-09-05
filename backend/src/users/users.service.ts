import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UserRole } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return user;
  }

  private async checkAdminSafety(
    targetUser: { id: string; role: UserRole; isActive: boolean },
    newRole?: UserRole,
    newIsActive?: boolean,
    currentAdminId?: string,
  ) {
    // If target is an ADMIN and role is changing away from ADMIN
    if (
      targetUser.role === UserRole.ADMIN &&
      newRole !== undefined &&
      newRole !== UserRole.ADMIN
    ) {
      const activeAdminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the only active administrator in the system',
        );
      }
    }

    // If target is an ADMIN and being deactivated
    if (targetUser.role === UserRole.ADMIN && newIsActive === false) {
      if (currentAdminId && targetUser.id === currentAdminId) {
        throw new BadRequestException(
          'You cannot deactivate your own administrator account',
        );
      }

      const activeAdminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the only active administrator in the system',
        );
      }
    }
  }

  async updateUser(id: string, dto: UpdateUserDto, currentAdminId?: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    if (dto.email && dto.email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('User with this email address already exists');
      }
    }

    await this.checkAdminSafety(targetUser, dto.role, dto.isActive, currentAdminId);

    const oldRole = targetUser.role;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.role && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
      },
      select: USER_SELECT_FIELDS,
    });

    // Notify user via email if their role was changed
    if (dto.role && dto.role !== oldRole) {
      await this.mailService.sendRoleChangeNotification(
        updatedUser.email,
        updatedUser.name,
        oldRole,
        updatedUser.role,
      );
    }

    return updatedUser;
  }

  async updateRole(id: string, newRole: UserRole, currentAdminId?: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    await this.checkAdminSafety(targetUser, newRole, undefined, currentAdminId);

    const oldRole = targetUser.role;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: USER_SELECT_FIELDS,
    });

    if (oldRole !== newRole) {
      await this.mailService.sendRoleChangeNotification(
        updatedUser.email,
        updatedUser.name,
        oldRole,
        updatedUser.role,
      );
    }

    return updatedUser;
  }

  async updateStatus(id: string, isActive: boolean, currentAdminId?: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    await this.checkAdminSafety(targetUser, undefined, isActive, currentAdminId);

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT_FIELDS,
    });
  }
}
