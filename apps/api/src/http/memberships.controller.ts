import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Inject,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { z } from 'zod';
import { Database, lock, audit } from '../infrastructure/database';
import { AuthRequest, Roles } from './security';
import { parse, uuid } from './validation';
@Roles('EMPRESA', 'BARBEIRO')
@Controller('memberships')
export class MembershipsController {
  constructor(@Inject(Database) private db: Database) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.db.transaction(req.actor, async (tx) => ({
      plans: await tx.$queryRawUnsafe(
        'SELECT p.*, (SELECT json_agg(s) FROM monthly_plan_services s WHERE s.plan_id=p.id AND s.tenant_id=p.tenant_id) AS services FROM monthly_plans p WHERE tenant_id=$1::uuid AND ($2::uuid IS NULL OR barber_id=$2::uuid)',
        req.actor.tenantId,
        req.actor.role === 'BARBEIRO' ? req.actor.barberId : null,
      ),
      members: await tx.$queryRawUnsafe(
        'SELECT m.* FROM client_memberships m JOIN monthly_plans p ON p.id=m.plan_id AND p.tenant_id=m.tenant_id WHERE m.tenant_id=$1::uuid AND ($2::uuid IS NULL OR p.barber_id=$2::uuid)',
        req.actor.tenantId,
        req.actor.role === 'BARBEIRO' ? req.actor.barberId : null,
      ),
    }));
  }
  @Post('plans') create(@Req() req: AuthRequest, @Body() body: unknown) {
    const input = parse(
      z
        .object({
          name: z.string().trim().min(2).max(80),
          barberId: uuid,
          priceCents: z.number().int().min(0).max(10000000),
          days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
          services: z
            .array(
              z.object({
                serviceId: uuid,
                outsidePriceCents: z.number().int().min(0).max(10000000).nullable(),
              }),
            )
            .min(1)
            .max(100),
        })
        .strict(),
      body,
    );
    if (req.actor.role === 'BARBEIRO' && input.barberId !== req.actor.barberId)
      throw new ForbiddenException();
    return this.db.transaction(req.actor, async (tx) => {
      if (
        !(await tx.barber.findFirst({
          where: { id: input.barberId, tenantId: req.actor.tenantId, active: true },
        }))
      )
        throw new NotFoundException();
      for (const s of input.services)
        if (
          !(await tx.service.findFirst({
            where: { id: s.serviceId, tenantId: req.actor.tenantId, active: true },
          }))
        )
          throw new NotFoundException();
      const rows: any[] = await tx.$queryRawUnsafe(
        'INSERT INTO monthly_plans(tenant_id,barber_id,name,price_cents,days) VALUES($1::uuid,$2::uuid,$3,$4,$5::integer[]) RETURNING id',
        req.actor.tenantId,
        input.barberId,
        input.name,
        input.priceCents,
        [...new Set(input.days)],
      );
      for (const s of input.services)
        await tx.$executeRawUnsafe(
          'INSERT INTO monthly_plan_services(tenant_id,plan_id,service_id,outside_price_cents) VALUES($1::uuid,$2::uuid,$3::uuid,$4)',
          req.actor.tenantId,
          rows[0].id,
          s.serviceId,
          s.outsidePriceCents,
        );
      await audit(tx, req.actor, 'CREATE_MONTHLY_PLAN', 'monthly_plans', rows[0].id);
      return rows[0];
    });
  }
  @Post() enroll() {
    throw new ForbiddenException('O cliente deve assinar e pagar pelo checkout.');
  }
}
