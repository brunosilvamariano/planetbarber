import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ServiceUnavailableException,
  UnauthorizedException,
  BadGatewayException,
} from '@nestjs/common';
export function verifyStripeWebhook(
  body: Buffer,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const entries = signature.split(',').map((s) => s.split('='));
  const timestamp = entries.find(([k]) => k === 't')?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300)
    throw new UnauthorizedException('Webhook expirado.');
  const expected = createHmac('sha256', secret)
    .update(timestamp + '.')
    .update(body)
    .digest();
  const valid = entries
    .filter(([k]) => k === 'v1')
    .some(([, value]) => {
      if (!/^[a-f0-9]{64}$/i.test(value || '')) return false;
      return timingSafeEqual(expected, Buffer.from(value, 'hex'));
    });
  if (!valid) throw new UnauthorizedException('Assinatura inválida.');
  return JSON.parse(body.toString('utf8'));
}
export async function stripeRequest(
  path: string,
  params: URLSearchParams,
  options: { account?: string; idempotencyKey: string },
) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new ServiceUnavailableException('Stripe ainda não configurada.');
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': options.idempotencyKey,
      ...(options.account ? { 'Stripe-Account': options.account } : {}),
    },
    body: params,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as any;
    const code = typeof error.error?.code === 'string' ? error.error.code : 'stripe_request_failed';
    const message = typeof error.error?.message === 'string' ? error.error.message : '';
    if (/Accounts v1 support|feat_accounts_v1_support/.test(message))
      throw new BadGatewayException('A Stripe exige habilitar compatibilidade Accounts v1 em Configurações → Desenvolvedores → Políticas de API para esta integração.');
    if (/connect/i.test(message) && /sign|platform|enable|register/i.test(message))
      throw new BadGatewayException('Ative e conclua a configuração do Stripe Connect no painel da PlanetBarber para conectar barbearias.');
    if (/country/i.test(message))
      throw new BadGatewayException('A Stripe recusou o país da conta conectada. Confira o país e a disponibilidade de Connect na conta da plataforma.');
    throw new BadGatewayException('Stripe recusou a operação (' + code.replace(/[^a-z_]/g, '') + '). Confira a configuração da plataforma Connect.');
  }
  return response.json();
}

export async function stripeGet(path:string,account:string):Promise<any>{const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new ServiceUnavailableException();const response=await fetch('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+key,'Stripe-Account':account},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new BadGatewayException('Falha na consulta Stripe.');return response.json();}
