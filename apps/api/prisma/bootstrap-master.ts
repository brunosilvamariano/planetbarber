import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { planDefinitions, SYSTEM_TENANT } from '../src/domain/policy';
let stage = 'validacao';

async function main() {
  const url = process.env.BOOTSTRAP_DATABASE_URL || '';
  const email = (process.env.BOOTSTRAP_MASTER_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_MASTER_PASSWORD || '';
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error('Use a URL completa comecando com postgresql://, sem aspas ou comandos.');
  }
  if (
    !['postgresql:', 'postgres:'].includes(parsed.protocol) ||
    !parsed.password ||
    parsed.password.includes('*')
  )
    throw new Error('Use a URL completa com a senha real do Neon, sem asteriscos.');
  if (
    parsed.username !== 'neondb_owner' ||
    !parsed.hostname.endsWith('.neon.tech') ||
    parsed.pathname !== '/neondb'
  )
    throw new Error('Use a URL direta do proprietario do banco neondb no Neon.');
  if (parsed.hostname.includes('-pooler')) throw new Error('Desligue Connection pooling no Neon.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalido.');
  if (password.length < 12 || password.length > 72 || Buffer.byteLength(password, 'utf8') > 72)
    throw new Error('Use uma senha com pelo menos 12 caracteres e no maximo 72 bytes.');
  parsed.searchParams.set('connect_timeout', '30');
  const prisma = new PrismaClient({ datasources: { db: { url: parsed.toString() } } });
  try {
    stage = 'conexao ao Neon';
    await prisma.$connect();
    console.log('Conexao ao Neon estabelecida.');
    stage = 'hash da senha';
    const passwordHash = await hash(password, 12);
    stage = 'criacao da conta em transacao';
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(736281009)`;
        await tx.$executeRaw`SELECT set_config('app.is_master','true',true)`;
        await tx.$executeRaw`SELECT set_config('app.tenant_id',${SYSTEM_TENANT},true)`;
        if (await tx.user.count({ where: { tenantId: SYSTEM_TENANT, role: 'MASTER' } }))
          throw new Error('Ja existe uma conta Master. Nenhuma senha foi alterada.');
        await tx.tenant.upsert({
          where: { id: SYSTEM_TENANT },
          create: { id: SYSTEM_TENANT, tenantId: SYSTEM_TENANT },
          update: {},
        });
        for (const definition of planDefinitions) {
          await tx.plan.upsert({
            where: { code: definition.code },
            create: { ...definition, tenantId: SYSTEM_TENANT },
            update: {},
          });
        }
        const plan = await tx.plan.findUniqueOrThrow({ where: { code: 'ENTERPRISE' } });
        const company = await tx.company.upsert({
          where: { slug: 'master' },
          create: {
            tenantId: SYSTEM_TENANT,
            name: 'BarberHub Platform',
            slug: 'master',
            planId: plan.id,
            dueAt: new Date('2100-01-01'),
          },
          update: {},
        });
        if (company.tenantId !== SYSTEM_TENANT)
          throw new Error('Tenant da plataforma inconsistente.');
        await tx.user.create({
          data: {
            tenantId: SYSTEM_TENANT,
            name: 'Bruno Mariano',
            email,
            passwordHash,
            role: 'MASTER',
          },
        });
      },
      { timeout: 30000, maxWait: 30000 },
    );
    console.log(`Conta Master criada: ${email}. Nenhuma barbearia de demonstracao criada.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  // Never print connection URLs, Prisma invocation details or credentials.
  const safe = ['Ja existe', 'Use ', 'Desligue', 'Email invalido', 'Tenant da'];
  const rawCode = error.code || error.errorCode;
  const code =
    typeof rawCode === 'string' && /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : 'SEM_CODIGO';
  const type = error instanceof TypeError ? 'TypeError' : error.constructor?.name;
  const safeType = typeof type === 'string' && /^[A-Za-z]{1,60}$/.test(type) ? type : 'Erro';
  console.error(
    safe.some((prefix) => error.message.startsWith(prefix))
      ? error.message
      : `Criacao nao concluida. Etapa: ${stage}. Tipo: ${safeType}. Codigo: ${code}.`,
  );
  process.exitCode = 1;
});
