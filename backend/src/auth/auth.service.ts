import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ActivateCustomerDto } from './dto/activate-customer.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async generateTokens(userId: string, email: string, role: string) {
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'dealflow_access_secret_key_2026';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'dealflow_refresh_secret_key_2026';

    const accessExpiry =
      this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry =
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';

    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiry as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiry as any,
    });

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string | null) {
    if (!refreshToken) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
      return;
    }
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = randomBytes(32).toString('hex');

    // Force public registration to default to SALES_REP and isVerified = false
    const addressVal = registerDto.address || registerDto.streetAddress;
    const newUser = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email.toLowerCase(),
        passwordHash,
        role: UserRole.SALES_REP,
        isActive: true,
        isVerified: false,
        emailVerificationToken: verificationToken,
        phone: registerDto.phone,
        address: addressVal,
        city: registerDto.city,
        state: registerDto.state,
        country: registerDto.country,
        postalCode: registerDto.postalCode,
      } as any,
    });

    const tokens = await this.generateTokens(
      newUser.id,
      newUser.email,
      newUser.role,
    );
    await this.updateRefreshTokenHash(newUser.id, tokens.refreshToken);

    // Send verification email via SMTP
    await this.mailService.sendVerificationEmail(
      newUser.email,
      newUser.name,
      verificationToken,
    );

    return {
      message:
        'Registration successful. Please verify your email address to unlock full CRM features.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        isVerified: newUser.isVerified,
        phone: newUser.phone,
        address: newUser.address,
        city: newUser.city,
        state: newUser.state,
        country: newUser.country,
        postalCode: newUser.postalCode,
        createdAt: newUser.createdAt,
      },
      verificationToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new UnauthorizedException('Verification token is required');
    }

    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired verification token');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationToken: null,
      },
    });

    return {
      message: 'Email address verified successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isVerified: updatedUser.isVerified,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is inactive. Please contact system administrator.',
      );
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        postalCode: user.postalCode,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'dealflow_refresh_secret_key_2026';

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('User session is invalid or expired');
    }

    const isRefreshMatch = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshMatch) {
      throw new UnauthorizedException('Invalid refresh token session');
    }

    const newTokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, newTokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        postalCode: user.postalCode,
      },
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  async logout(userId: string) {
    await this.updateRefreshTokenHash(userId, null);
    return { message: 'Successfully logged out' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      phone: user.phone,
      address: user.address,
      city: user.city,
      state: user.state,
      country: user.country,
      postalCode: user.postalCode,
      createdAt: user.createdAt,
      customerId: user.customerId,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let passwordHash: string | undefined = undefined;
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(passwordHash !== undefined && { passwordHash }),
      },
    });

    return {
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        country: updatedUser.country,
        postalCode: updatedUser.postalCode,
      },
    };
  }

  async validateCustomerToken(token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const customer = await this.prisma.customer.findFirst({
      where: { invitationTokenHash: tokenHash },
    });

    if (!customer) {
      throw new NotFoundException('Invalid or expired activation token');
    }

    if (customer.invitationExpiresAt && customer.invitationExpiresAt < new Date()) {
      throw new BadRequestException('Activation token has expired');
    }

    return {
      valid: true,
      email: customer.contactEmail,
      customerName: customer.companyName || customer.name,
    };
  }

  async activateCustomerAccount(activateDto: ActivateCustomerDto) {
    const { token, password } = activateDto;
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const customer = await this.prisma.customer.findFirst({
      where: { invitationTokenHash: tokenHash },
    });

    if (!customer) {
      throw new NotFoundException('Invalid or already used activation token');
    }

    if (customer.invitationExpiresAt && customer.invitationExpiresAt < new Date()) {
      throw new BadRequestException('Activation token has expired');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const email = customer.contactEmail.toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: UserRole.CUSTOMER,
          isActive: true,
          isVerified: true,
          customerId: customer.id,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          name: customer.name || customer.companyName,
          email,
          passwordHash,
          role: UserRole.CUSTOMER,
          isActive: true,
          isVerified: true,
          customerId: customer.id,
        },
      });
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        invitationTokenHash: null,
        invitationExpiresAt: null,
        isInvited: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      message: 'Account activated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
