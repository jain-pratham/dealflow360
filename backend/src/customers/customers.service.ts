import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private transformCustomer(c: any) {
    return {
      id: c.id,
      companyName: c.companyName,
      contactName: c.name,
      email: c.contactEmail,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      customerTier: c.tier,
      currency: c.currency,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async findAll() {
    const rawCustomers = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return rawCustomers.map((c) => this.transformCustomer(c));
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    return this.transformCustomer(customer);
  }

  async create(dto: CreateCustomerDto) {
    const emailLower = dto.email.toLowerCase();

    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        contactEmail: {
          equals: emailLower,
          mode: 'insensitive',
        },
      },
    });

    if (existingCustomer) {
      throw new ConflictException(`A customer with email '${dto.email}' already exists. Please use a unique email.`);
    }

    const created = await this.prisma.customer.create({
      data: {
        companyName: dto.companyName,
        name: dto.contactName,
        contactEmail: emailLower,
        phone: dto.phone || null,
        address: dto.address || null,
        city: dto.city || null,
        state: dto.state || null,
        country: dto.country || 'India',
        tier: dto.tier || 'BRONZE',
        currency: dto.currency || 'INR',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return this.transformCustomer(created);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    if (dto.email && dto.email.toLowerCase() !== existing.contactEmail.toLowerCase()) {
      const emailConflict = await this.prisma.customer.findFirst({
        where: {
          contactEmail: {
            equals: dto.email.toLowerCase(),
            mode: 'insensitive',
          },
        },
      });
      if (emailConflict && emailConflict.id !== id) {
        throw new ConflictException(`A customer with email '${dto.email}' already exists. Please use a unique email.`);
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.companyName && { companyName: dto.companyName }),
        ...(dto.contactName && { name: dto.contactName }),
        ...(dto.email && { contactEmail: dto.email.toLowerCase() }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.tier && { tier: dto.tier }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.transformCustomer(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: 'Customer deleted successfully' };
  }
}
