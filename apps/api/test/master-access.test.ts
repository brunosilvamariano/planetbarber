import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare } from 'bcryptjs';
import { MasterService } from '../src/application/master.service';
import { SYSTEM_TENANT, Actor } from '../src/domain/policy';
const actor: Actor = { id: SYSTEM_TENANT, tenantId: SYSTEM_TENANT, role: 'MASTER' };
function service(tx: any) {
  return new MasterService({ transaction: async (_: unknown, fn: any) => fn(tx) } as any);
}
test('access management rejects non-Master and invalid platform tenant', async () => {
  for (const denied of [
    { ...actor, role: 'EMPRESA' },
    { ...actor, tenantId: 'other' },
  ]) {
    await assert.rejects(service({}).access(denied as Actor, 'company'));
    await assert.rejects(
      service({}).resetManagerPassword(denied as Actor, 'company', 'user', 'long-password'),
    );
  }
});
test('access returns only manager identity fields, no password data', async () => {
  const result = await service({
    company: { findUnique: async () => ({ name: 'Silva', slug: 'silva', tenantId: 'tenant' }) },
    user: {
      findMany: async (args: any) => {
        assert.deepEqual(args.where, { tenantId: 'tenant', role: 'EMPRESA' });
        assert.deepEqual(args.select, { id: true, name: true, email: true, active: true });
        return [];
      },
    },
  }).access(actor, 'company');
  assert.deepEqual(result, { name: 'Silva', slug: 'silva', managers: [] });
});
test('reset hashes password, targets tenant manager, revokes refresh tokens and audits without secret', async () => {
  const password = 'test-password-long';
  let updated = false,
    revoked = false,
    audited = false;
  await service({
    company: { findUnique: async () => ({ tenantId: 'tenant' }) },
    user: {
      findFirst: async (args: any) => {
        assert.deepEqual(args.where, {
          id: 'user',
          tenantId: 'tenant',
          role: 'EMPRESA',
          active: true,
        });
        return { id: 'user' };
      },
      update: async (args: any) => {
        assert.deepEqual(args.where, { tenantId_id: { tenantId: 'tenant', id: 'user' } });
        assert.ok(await compare(password, args.data.passwordHash));
        updated = true;
      },
    },
    refreshToken: {
      updateMany: async (args: any) => {
        assert.deepEqual(args.where, { tenantId: 'tenant', userId: 'user', revokedAt: null });
        revoked = true;
      },
    },
    auditLog: {
      create: async (args: any) => {
        assert.equal(args.data.action, 'RESET_MANAGER_PASSWORD');
        assert.ok(!JSON.stringify(args).includes(password));
        audited = true;
      },
    },
  }).resetManagerPassword(actor, 'company', 'user', password);
  assert.ok(updated && revoked && audited);
});
test('reset rejects nonexistent, foreign or non-manager account without writing', async () => {
  await assert.rejects(
    service({
      company: { findUnique: async () => ({ tenantId: 'tenant' }) },
      user: { findFirst: async () => null },
    }).resetManagerPassword(actor, 'company', 'foreign', 'long-password'),
  );
  await assert.rejects(
    service({ company: { findUnique: async () => ({ tenantId: SYSTEM_TENANT }) } }).access(
      actor,
      'platform',
    ),
  );
});
