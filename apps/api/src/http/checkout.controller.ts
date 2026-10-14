import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  Inject,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { Database, lock } from '../infrastructure/database';
import { stripeRequest, stripeGet, verifyStripeWebhook } from '../infrastructure/stripe';
import { AuthRequest, Roles, Public, systemActor } from './security';
import { parse, uuid } from './validation';
@Controller('subscriptions')
export class CheckoutController {
  constructor(@Inject(Database) private db: Database) {}
  private async reconcile(req: AuthRequest) {
    const rows: any[] = await this.db.transaction(req.actor, (tx) =>
      tx.$queryRawUnsafe(
        `SELECT * FROM stripe_checkouts WHERE tenant_id=$1::uuid AND client_id=$2::uuid AND session_id IS NOT NULL AND status IN ('PENDING','ACTIVE','PAST_DUE') ORDER BY created_at DESC LIMIT 10`,
        req.actor.tenantId,
        req.actor.clientId,
      ),
    );
    for (const row of rows) {
      try {
        const session = await stripeGet(
          'checkout/sessions/' + encodeURIComponent(row.session_id),
          row.account_id,
        );
        if (session.status === 'expired') {
          await this.db.transaction(req.actor, (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE stripe_checkouts SET status='EXPIRED' WHERE id=$1::uuid AND tenant_id=$2::uuid`,
              row.id,
              req.actor.tenantId,
            ),
          );
          continue;
        }
        if (
          session.status !== 'complete' ||
          !session.subscription ||
          session.metadata?.request_id !== row.id
        )
          continue;
        const subId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const sub = await stripeGet('subscriptions/' + encodeURIComponent(subId), row.account_id);
        if (sub.metadata?.request_id !== row.id || !sub.latest_invoice) continue;
        const invoice = await stripeGet(
          'invoices/' +
            encodeURIComponent(
              typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id,
            ),
          row.account_id,
        );
        if (invoice.status !== 'paid' || invoice.amount_paid <= 0 || invoice.currency !== 'brl')
          continue;
        const line = invoice.lines?.data?.find(
          (l: any) => l.parent?.subscription_item_details || l.type === 'subscription',
        );
        if (!line?.period?.start || !line?.period?.end) continue;
        const start = new Date(line.period.start * 1000),
          end = new Date(line.period.end * 1000);
        const date = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        await this.db.transaction(req.actor, async (tx) => {
          await lock(tx, 'paid-membership:' + row.id);
          await tx.$executeRawUnsafe(
            'INSERT INTO client_memberships(tenant_id,client_id,plan_id,starts_on,ends_on,stripe_subscription_id,paid_until) VALUES($1::uuid,$2::uuid,$3::uuid,$4::date,$5::date,$6,$7) ON CONFLICT(stripe_subscription_id) DO UPDATE SET ends_on=GREATEST(client_memberships.ends_on,EXCLUDED.ends_on),paid_until=GREATEST(client_memberships.paid_until,EXCLUDED.paid_until)',
            req.actor.tenantId,
            req.actor.clientId,
            row.plan_id,
            date(start),
            date(new Date(+end - 1)),
            subId,
            end,
          );
          await tx.$executeRawUnsafe(
            'UPDATE stripe_checkouts SET status=$1,subscription_id=$2 WHERE id=$3::uuid AND tenant_id=$4::uuid',
            sub.status === 'canceled' ? 'CANCELLED' : 'ACTIVE',
            subId,
            row.id,
            req.actor.tenantId,
          );
        });
      } catch {
        /* Preserve existing coverage when Stripe is temporarily unavailable. */
      }
    }
  }
  @Get() @Roles('CLIENTE') async list(@Req() req: AuthRequest) {
    await this.reconcile(req);
    const result: any = await this.db.transaction(req.actor, async (tx) => ({
      plans: await tx.$queryRawUnsafe(
        `SELECT p.*,b.name AS barber_name,(SELECT json_agg(s.name) FROM monthly_plan_services ps JOIN services s ON s.id=ps.service_id AND s.tenant_id=ps.tenant_id WHERE ps.plan_id=p.id AND ps.tenant_id=p.tenant_id) AS services FROM monthly_plans p JOIN barbers b ON b.id=p.barber_id AND b.tenant_id=p.tenant_id WHERE p.tenant_id=$1::uuid AND b.active=true`,
        req.actor.tenantId,
      ),
      members: await tx.$queryRawUnsafe(
        `SELECT m.*,p.name,q.account_id,q.status AS payment_status FROM client_memberships m JOIN monthly_plans p ON p.id=m.plan_id LEFT JOIN stripe_checkouts q ON q.subscription_id=m.stripe_subscription_id AND q.tenant_id=m.tenant_id WHERE m.tenant_id=$1::uuid AND m.client_id=$2::uuid`,
        req.actor.tenantId,
        req.actor.clientId,
      ),
    }));
    result.members = await Promise.all(
      result.members.map(async (m: any) => {
        if (!m.account_id || !m.stripe_subscription_id) return m;
        try {
          const sub = await stripeGet(
            'subscriptions/' + encodeURIComponent(m.stripe_subscription_id),
            m.account_id,
          );
          const next = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
          return {
            ...m,
            stripe_status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            next_billing_at: next ? new Date(next * 1000).toISOString() : null,
            recurring_price_cents: sub.items?.data?.[0]?.price?.unit_amount,
          };
        } catch {
          return { ...m, billing_unavailable: true };
        }
      }),
    );
    return result;
  }
  @Post('portal') @Roles('CLIENTE') async portal(@Req() req: AuthRequest, @Body() body: unknown) {
    const { membershipId } = parse(z.object({ membershipId: uuid }).strict(), body);
    const rows: any[] = await this.db.transaction(req.actor, (tx) =>
      tx.$queryRawUnsafe(
        'SELECT m.stripe_subscription_id,q.account_id,c.slug FROM client_memberships m JOIN stripe_checkouts q ON q.subscription_id=m.stripe_subscription_id AND q.tenant_id=m.tenant_id JOIN companies c ON c.tenant_id=m.tenant_id WHERE m.tenant_id=$1::uuid AND m.client_id=$2::uuid AND m.id=$3::uuid',
        req.actor.tenantId,
        req.actor.clientId,
        membershipId,
      ),
    );
    if (!rows[0]) throw new NotFoundException();
    const m = rows[0];
    const sub = await stripeGet(
      'subscriptions/' + encodeURIComponent(m.stripe_subscription_id),
      m.account_id,
    );
    const origins = (process.env.WEB_ORIGIN || '').split(',').map((s) => s.trim());
    const origin =
      req.headers.origin && origins.includes(req.headers.origin) ? req.headers.origin : origins[0];
    const session: any = await stripeRequest(
      'billing_portal/sessions',
      new URLSearchParams({
        customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        return_url: origin + '/cliente?empresa=' + encodeURIComponent(m.slug) + '#assinaturas',
      }),
      { account: m.account_id, idempotencyKey: 'portal-' + membershipId + '-' + Date.now() },
    );
    return { url: session.url };
  }
  @Post('checkout') @Roles('CLIENTE') async checkout(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    const { planId } = parse(z.object({ planId: uuid }).strict(), body);
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      throw new ServiceUnavailableException('Confirmação Stripe ainda não configurada.');
    const allowedOrigins = (process.env.WEB_ORIGIN || '').split(',').map((value) => value.trim());
    const requestedOrigin = req.headers.origin;
    const origin =
      requestedOrigin && allowedOrigins.includes(requestedOrigin)
        ? requestedOrigin
        : allowedOrigins[0];
    if (!/^https?:\/\//.test(origin)) throw new ServiceUnavailableException();
    const row: any = await this.db.transaction(req.actor, async (tx) => {
      await lock(tx, 'checkout:' + req.actor.tenantId + ':' + req.actor.clientId);
      const plans: any[] = await tx.$queryRawUnsafe(
        `SELECT p.*,s.account_id,c.slug FROM monthly_plans p JOIN stripe_accounts s ON s.tenant_id=p.tenant_id JOIN companies c ON c.tenant_id=p.tenant_id WHERE p.tenant_id=$1::uuid AND p.id=$2::uuid`,
        req.actor.tenantId,
        planId,
      );
      const p = plans[0];
      if (!p) throw new NotFoundException('Plano ou recebimentos não configurados.');
      if (p.price_cents <= 0)
        throw new ConflictException('Plano precisa ter mensalidade positiva.');
      const existing: any[] = await tx.$queryRawUnsafe(
        `SELECT q.id FROM stripe_checkouts q JOIN monthly_plans p ON p.id=q.plan_id WHERE q.tenant_id=$1::uuid AND q.client_id=$2::uuid AND p.barber_id=$3::uuid AND (q.status IN ('ACTIVE','PAST_DUE') OR (q.status='PENDING' AND q.created_at>now()-interval '24 hours'))`,
        req.actor.tenantId,
        req.actor.clientId,
        p.barber_id,
      );
      if (existing.length)
        throw new ConflictException(
          'Já existe uma assinatura ou checkout em andamento para este profissional.',
        );
      const rows: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO stripe_checkouts(tenant_id,client_id,plan_id,account_id) VALUES($1::uuid,$2::uuid,$3::uuid,$4) RETURNING id`,
        req.actor.tenantId,
        req.actor.clientId,
        planId,
        p.account_id,
      );
      return { ...p, requestId: rows[0].id };
    });
    try {
      const params = new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price_data][currency]': 'brl',
        'line_items[0][price_data][unit_amount]': String(row.price_cents),
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][price_data][product_data][name]': row.name,
        'line_items[0][quantity]': '1',
        'subscription_data[metadata][request_id]': row.requestId,
        'metadata[request_id]': row.requestId,
        success_url: origin + '/cliente?empresa=' + encodeURIComponent(row.slug) + '#assinaturas',
        cancel_url: origin + '/cliente?empresa=' + encodeURIComponent(row.slug) + '#assinaturas',
      });
      const session: any = await stripeRequest('checkout/sessions', params, {
        account: row.account_id,
        idempotencyKey: row.requestId,
      });
      await this.db.transaction(req.actor, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE stripe_checkouts SET session_id=$1 WHERE id=$2::uuid AND tenant_id=$3::uuid`,
          session.id,
          row.requestId,
          req.actor.tenantId,
        ),
      );
      return { url: session.url };
    } catch (e) {
      await this.db.transaction(req.actor, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE stripe_checkouts SET status='FAILED' WHERE id=$1::uuid AND tenant_id=$2::uuid`,
          row.requestId,
          req.actor.tenantId,
        ),
      );
      throw e;
    }
  }
  @Post('webhook') @Public() async webhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !req.rawBody) throw new ServiceUnavailableException();
    const event = verifyStripeWebhook(req.rawBody, signature || '', secret);
    if (
      ![
        'invoice.paid',
        'invoice.payment_failed',
        'customer.subscription.deleted',
        'checkout.session.expired',
      ].includes(event.type)
    )
      return { received: true };
    if (!event.account) throw new UnauthorizedException();
    if (event.livemode !== (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_'))
      throw new UnauthorizedException('Ambiente Stripe incompatível.');
    const object = event.data.object;
    let requestId = object.metadata?.request_id,
      subscriptionId =
        typeof object.subscription === 'string'
          ? object.subscription
          : object.parent?.subscription_details?.subscription;
    if (event.type.startsWith('invoice.')) {
      if (!subscriptionId) return { received: true };
      const sub = await stripeGet(
        'subscriptions/' + encodeURIComponent(subscriptionId),
        event.account,
      );
      requestId = sub.metadata?.request_id;
    } else if (event.type === 'customer.subscription.deleted') {
      subscriptionId = object.id;
    }
    if (!requestId) return { received: true };
    parse(uuid, requestId);
    const rows: any[] = await this.db.transaction(systemActor, (tx) =>
      tx.$queryRawUnsafe(
        `SELECT * FROM stripe_checkouts WHERE id=$1::uuid AND account_id=$2`,
        requestId,
        event.account,
      ),
    );
    const row = rows[0];
    if (!row) return { received: true };
    const actor = { ...systemActor, tenantId: row.tenant_id };
    const paidInvoice =
      event.type === 'invoice.paid'
        ? await stripeGet('invoices/' + encodeURIComponent(object.id), event.account)
        : null;
    await this.db.transaction(actor, async (tx) => {
      const inserted = await tx.$executeRawUnsafe(
        `INSERT INTO stripe_processed_events(event_id) VALUES($1) ON CONFLICT DO NOTHING`,
        event.id,
      );
      if (!inserted) return;
      await lock(tx, 'paid-membership:' + row.id);
      if (event.type === 'invoice.paid') {
        const invoice = paidInvoice;
        if (invoice.status !== 'paid' || invoice.amount_paid <= 0 || invoice.currency !== 'brl')
          throw new ConflictException('Pagamento não confirmado.');
        const line = invoice.lines?.data?.find(
          (l: any) => l.parent?.subscription_item_details || l.type === 'subscription',
        );
        if (!line?.period?.start || !line?.period?.end)
          throw new ConflictException('Período ausente.');
        const start = new Date(line.period.start * 1000),
          end = new Date(line.period.end * 1000);
        const date = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        await tx.$executeRawUnsafe(
          `INSERT INTO client_memberships(tenant_id,client_id,plan_id,starts_on,ends_on,stripe_subscription_id,paid_until) VALUES($1::uuid,$2::uuid,$3::uuid,$4::date,$5::date,$6,$7) ON CONFLICT(stripe_subscription_id) DO UPDATE SET ends_on=GREATEST(client_memberships.ends_on,EXCLUDED.ends_on),paid_until=GREATEST(client_memberships.paid_until,EXCLUDED.paid_until)`,
          row.tenant_id,
          row.client_id,
          row.plan_id,
          date(start),
          date(new Date(+end - 1)),
          subscriptionId,
          end,
        );
        await tx.$executeRawUnsafe(
          `UPDATE stripe_checkouts SET status='ACTIVE',subscription_id=$1 WHERE id=$2::uuid`,
          subscriptionId,
          row.id,
        );
      } else {
        const status =
          event.type === 'customer.subscription.deleted'
            ? 'CANCELLED'
            : event.type === 'checkout.session.expired'
              ? 'EXPIRED'
              : 'PAST_DUE';
        await tx.$executeRawUnsafe(
          `UPDATE stripe_checkouts SET status=$1 WHERE id=$2::uuid`,
          status,
          row.id,
        );
      }
    });
    return { received: true };
  }
}
