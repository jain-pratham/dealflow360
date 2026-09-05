import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AdminTestController } from './admin-test.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { AdminBootstrapService } from './admin-bootstrap.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController, AdminTestController],
  providers: [
    AuthService,
    AdminBootstrapService,
    JwtStrategy,
    RolesGuard,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    AdminBootstrapService,
    JwtStrategy,
    RolesGuard,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
