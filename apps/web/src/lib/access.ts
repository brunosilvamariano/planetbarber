import type { AuthPortal, Role } from './data';

export function entryContext(pathname: string, search: string) {
  const portal: AuthPortal =
    pathname === '/master' ? 'master' : pathname === '/cliente' ? 'client' : 'team';
  return {
    portal,
    slug: portal === 'master' ? '' : new URLSearchParams(search).get('empresa') || '',
  };
}

export function matchesEntry(
  identity: { role: Role; companySlug?: string },
  entry: ReturnType<typeof entryContext>,
) {
  const roles: Role[] =
    entry.portal === 'master'
      ? ['MASTER']
      : entry.portal === 'client'
        ? ['CLIENTE']
        : ['EMPRESA', 'BARBEIRO'];
  return roles.includes(identity.role) && (!entry.slug || identity.companySlug === entry.slug);
}
