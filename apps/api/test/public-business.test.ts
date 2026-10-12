import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/application/auth.service';

test('public business exposes only the requested active company name and slug', async () => {
  const service = new AuthService(
    {
      transaction: async (_actor: unknown, fn: any) =>
        fn({
          company: {
            findUnique: async ({ where }: any) => {
              assert.deepEqual(where, { slug: 'studio-original' });
              return {
                name: 'Studio Original',
                slug: 'studio-original',
                status: 'ACTIVE',
                tenantId: 'private',
                planId: 'private',
              };
            },
          },
        }),
    } as any,
    {} as any,
  );
  assert.deepEqual(await service.publicBusiness('studio-original'), {
    name: 'Studio Original',
    slug: 'studio-original',
  });
});

test('public business refuses unknown, suspended and platform entries', async () => {
  for (const company of [
    null,
    { slug: 'studio-original', status: 'SUSPENDED' },
    { slug: 'master', status: 'ACTIVE' },
  ]) {
    const service = new AuthService(
      {
        transaction: async (_actor: unknown, fn: any) =>
          fn({ company: { findUnique: async () => company } }),
      } as any,
      {} as any,
    );
    await assert.rejects(service.publicBusiness(company?.slug || 'missing'));
  }
});
