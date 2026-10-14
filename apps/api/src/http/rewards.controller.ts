import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { Database } from '../infrastructure/database';
import { AuthRequest, Roles } from './security';
import { parse, uuid } from './validation';
@Roles('EMPRESA', 'BARBEIRO')
@Controller('rewards')
export class RewardsController {
  constructor(@Inject(Database) private db: Database) {}
  private async client(tx: any, req: AuthRequest, id: string) {
    const row = await tx.client.findFirst({
      where: {
        id,
        tenantId: req.actor.tenantId,
        ...(req.actor.role === 'BARBEIRO'
          ? { appointments: { some: { barberId: req.actor.barberId } } }
          : {}),
      },
    });
    if (!row) throw new NotFoundException();
  }
  @Get() list(@Req() req: AuthRequest) {
    return this.db.transaction(req.actor, (tx) =>
      tx.$queryRawUnsafe(
        'SELECT r.id,r.client_id AS "clientId",r.description,r.delivered FROM client_rewards r WHERE r.tenant_id=$1::uuid AND ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM appointments a WHERE a.tenant_id=r.tenant_id AND a.client_id=r.client_id AND a.barber_id=$2::uuid)) ORDER BY r.created_at DESC LIMIT 500',
        req.actor.tenantId,
        req.actor.role === 'BARBEIRO' ? req.actor.barberId : null,
      ),
    );
  }
  @Post() create(@Req() req: AuthRequest, @Body() body: unknown) {
    const input = parse(
      z.object({ clientId: uuid, description: z.string().trim().min(2).max(200) }).strict(),
      body,
    );
    return this.db.transaction(req.actor, async (tx) => {
      await this.client(tx, req, input.clientId);
      await tx.$executeRawUnsafe(
        'INSERT INTO client_rewards(tenant_id,client_id,description) VALUES($1::uuid,$2::uuid,$3)',
        req.actor.tenantId,
        input.clientId,
        input.description,
      );
      return { success: true };
    });
  }
  @Patch(':id') deliver(@Req() req: AuthRequest, @Param('id') id: string) {
    parse(uuid, id);
    return this.db.transaction(req.actor, async (tx) => {
      const rows: any[] = await tx.$queryRawUnsafe(
        'SELECT client_id FROM client_rewards WHERE tenant_id=$1::uuid AND id=$2::uuid',
        req.actor.tenantId,
        id,
      );
      if (!rows[0]) throw new NotFoundException();
      await this.client(tx, req, rows[0].client_id);
      await tx.$executeRawUnsafe(
        'UPDATE client_rewards SET delivered=true WHERE tenant_id=$1::uuid AND id=$2::uuid',
        req.actor.tenantId,
        id,
      );
      return { success: true };
    });
  }
}
