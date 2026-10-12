import type { Company } from './data';
export function masterAnalytics(companies: Company[], months: number, now = new Date()) {
  const active = companies.filter((c) => c.status === 'ACTIVE');
  const acquisition = Array.from({ length: months }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + i + 1, 1));
    const key = date.toISOString().slice(0, 7);
    return {
      name: date
        .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
        .replace('.', ''),
      value: companies.filter((c) => c.createdAt?.slice(0, 7) === key).length,
    };
  });
  return {
    active,
    suspended: companies.filter((c) => c.status === 'SUSPENDED'),
    cancelled: companies.filter((c) => c.status === 'CANCELLED'),
    mrr: active.reduce((sum, company) => sum + (company.plan.priceCents ?? 0), 0),
    missingDates: companies.some((c) => !c.createdAt),
    acquisition,
    plans: ['START', 'PRO', 'PREMIUM', 'ENTERPRISE'].map((code) => ({
      name: code[0] + code.slice(1).toLowerCase(),
      companies: companies.filter((c) => c.plan.code === code).length,
      revenue: active
        .filter((c) => c.plan.code === code)
        .reduce((sum, c) => sum + (c.plan.priceCents ?? 0), 0),
    })),
  };
}
