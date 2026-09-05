import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.bootstrapAdmin();
  }

  async bootstrapAdmin() {
    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') ||
      process.env.ADMIN_EMAIL ||
      'admin@dealflow360.com';

    const adminPassword =
      this.configService.get<string>('ADMIN_PASSWORD') ||
      process.env.ADMIN_PASSWORD ||
      'ChangeThisStrongPassword123!';

    if (!adminEmail || !adminPassword) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be configured.',
      );
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();

    // Check if initial admin account already exists (Idempotent check)
    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingAdmin) {
      this.logger.log(
        `Admin user (${normalizedEmail}) already exists. Skipping bootstrap.`,
      );
      return;
    }

    // Securely hash admin password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create single initial bootstrap admin user
    await this.prisma.user.create({
      data: {
        name: 'System Admin',
        email: normalizedEmail,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
      },
    });

    this.logger.log(
      `Initial Admin user bootstrap successfully completed for: ${normalizedEmail}`,
    );
  }
}
