import { Controller, Get, Post, Body, Param, Req, Inject, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { Database } from '../infrastructure/database';
import { AuthRequest, Roles } from './security';
import { parse, uuid } from './validation';
@Roles('EMPRESA', 'BARBEIRO', 'CLIENTE')
@Controller('chat')
export class ChatController {
  constructor(@Inject(Database) private db: Database) {}
  private async appointment(tx: any, req: AuthRequest, id: string) {
    const row = await tx.appointment.findFirst({
      where: {
        id,
        tenantId: req.actor.tenantId,
        ...(req.actor.role === 'BARBEIRO'
          ? { barberId: req.actor.barberId }
          : req.actor.role === 'CLIENTE'
            ? { clientId: req.actor.clientId }
            : {}),
      },
    });
    if (!row) throw new NotFoundException('Agendamento não encontrado.');
    return row;
  }
  @Get() list(@Req() req: AuthRequest) {
    return this.db.transaction(req.actor, (tx) =>
      tx.appointment.findMany({
        where: {
          tenantId: req.actor.tenantId,
          ...(req.actor.role === 'BARBEIRO'
            ? { barberId: req.actor.barberId }
            : req.actor.role === 'CLIENTE'
              ? { clientId: req.actor.clientId }
              : {}),
        },
        include: { client: true, barber: true, service: true },
        orderBy: { startsAt: 'desc' },
        take: 100,
      }),
    );
  }
  @Get(':id') messages(@Req() req: AuthRequest, @Param('id') id: string) {
    parse(uuid, id);
    return this.db.transaction(req.actor, async (tx) => {
      await this.appointment(tx, req, id);
      return tx.$queryRawUnsafe(
        'SELECT id, body, sender_role AS "senderRole", created_at AS "createdAt" FROM chat_messages WHERE tenant_id=$1::uuid AND appointment_id=$2::uuid ORDER BY created_at DESC, id DESC LIMIT 200',
        req.actor.tenantId,
        id,
      );
    });
  }
  @Post(':id') send(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    parse(uuid, id);
    const input = parse(z.object({ body: z.string().trim().min(1).max(2000) }).strict(), body);
    return this.db.transaction(req.actor, async (tx) => {
      await this.appointment(tx, req, id);
      await tx.$executeRawUnsafe(
        'INSERT INTO chat_messages (id,tenant_id,appointment_id,sender_id,sender_role,body) VALUES (gen_random_uuid(),$1::uuid,$2::uuid,$3::uuid,$4,$5)',
        req.actor.tenantId,
        id,
        req.actor.id,
        req.actor.role,
        input.body,
      );
      return { success: true };
    });
  }
}
