import { Controller, Post, Req, Inject, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database, audit } from '../infrastructure/database';
import { stripeRequest } from '../infrastructure/stripe';
import { AuthRequest, Roles } from './security';
@Roles('EMPRESA')
@Controller('payments')
export class PaymentsController {
  constructor(@Inject(Database) private db: Database) {}
  @Post('connect') async connect(@Req() req: AuthRequest) {
    const origin = (process.env.WEB_ORIGIN || '').split(',').find((v) => /^https?:\/\//.test(v));
    if (!origin) throw new ServiceUnavailableException('Origem do site não configurada.');
    let account = await this.db.transaction(req.actor, async (tx) => {
      const rows: { account_id: string }[] = await tx.$queryRawUnsafe(
        'SELECT account_id FROM stripe_accounts WHERE tenant_id=$1::uuid',
        req.actor.tenantId,
      );
      return rows[0]?.account_id;
    });
    if (!account) {
      const response: any = await stripeRequest(
        'accounts',
        new URLSearchParams({
          type: 'standard',
          country: 'BR',
          'metadata[tenant_id]': req.actor.tenantId,
        }),
        { idempotencyKey: 'connect-account-v1-enabled-' + req.actor.tenantId },
      );
      account = response.id;
      await this.db.transaction(req.actor, async (tx) => {
        await tx.$executeRawUnsafe(
          'INSERT INTO stripe_accounts(tenant_id,account_id) VALUES($1::uuid,$2) ON CONFLICT(tenant_id) DO NOTHING',
          req.actor.tenantId,
          account,
        );
        await audit(tx, req.actor, 'CONNECT_STRIPE', 'stripe_accounts');
      });
    }
    const link: any = await stripeRequest(
      'account_links',
      new URLSearchParams({
        account,
        type: 'account_onboarding',
        refresh_url: origin + '/app#mensalidades',
        return_url: origin + '/app#mensalidades',
      }),
      { idempotencyKey: 'connect-link-' + randomUUID() },
    );
    return { url: link.url };
  }
}
