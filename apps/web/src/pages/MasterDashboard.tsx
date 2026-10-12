import { useState, type ReactNode } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowUpRight,
  Building2,
  Users,
  Scissors,
  CalendarDays,
  Plus,
  ArrowRight,
  ShieldCheck,
  Wallet,
  CircleHelp,
} from 'lucide-react';
import type { Snapshot } from '../lib/data';
import { money } from '../lib/utils';
import { Button } from '../components/ui/button';
import { masterAnalytics } from '../lib/master-analytics';

const palette = ['#3b82f6', '#6fa8ef', '#5dc6b2', '#e7ba77'];
const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  color: 'var(--foreground)',
  boxShadow: '0 16px 40px #0002',
  fontSize: 12,
};
export default function MasterDashboard({
  data,
  name,
  companiesTable,
  createCompany,
  go,
}: {
  data: Snapshot;
  name: string;
  companiesTable: ReactNode;
  createCompany: () => void;
  go: (page: string) => void;
}) {
  const [months, setMonths] = useState(6);
  const [planMode, setPlanMode] = useState<'revenue' | 'companies'>('revenue');
  const analytics = masterAnalytics(data.companies, months);
  const metrics = data.metrics;
  const mrr = metrics?.mrrCents ?? analytics.mrr;
  const active = metrics?.activeCompanies ?? analytics.active.length;
  const total = data.companies.length;
  const churn = metrics?.churnPercent ?? 0;
  const statuses = [
    { name: 'Ativas', value: active, color: '#66c5b3' },
    { name: 'Suspensas', value: analytics.suspended.length, color: '#e7ba77' },
    { name: 'Canceladas', value: analytics.cancelled.length, color: '#94a3b8' },
  ];
  const stats = [
    {
      label: 'Receita recorrente mensal',
      value: money(mrr),
      caption: 'MRR · assinaturas ativas',
      icon: Wallet,
      accent: true,
    },
    {
      label: 'Empresas ativas',
      value: String(active),
      caption: `${total} empresas na plataforma`,
      icon: Building2,
    },
    {
      label: 'Receita anual projetada',
      value: money(metrics?.arrCents ?? mrr * 12),
      caption: 'ARR · MRR × 12 meses',
      icon: ArrowUpRight,
    },
    {
      label: 'Churn do mês',
      value: `${churn.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
      caption: 'Cancelamentos da base inicial',
      icon: ShieldCheck,
    },
  ];
  return (
    <section className="master-premium" aria-label="Indicadores executivos da plataforma">
      <div className="master-welcome">
        <div>
          <span className="premium-eyebrow">SEU CENTRO DE CONTROLE</span>
          <h2>
            Olá, {name.split(' ')[0]}.<br />
            Uma visão completa do seu negócio<span>.</span>
          </h2>
          <p>Empresas, assinaturas e operação. Tudo conectado, em um só lugar.</p>
        </div>
        <div className="welcome-actions">
          <span className="live-pill">
            <i /> Visão atual da plataforma
          </span>
          <Button onClick={createCompany}>
            <Plus size={16} /> Nova empresa
          </Button>
        </div>
      </div>
      <div className="executive-kpis">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`executive-kpi ${stat.accent ? 'kpi-featured' : ''}`}
          >
            <div className="executive-kpi-top">
              <span>{stat.label}</span>
              <stat.icon size={18} />
            </div>
            <strong>{stat.value}</strong>
            <p>{stat.caption}</p>
          </article>
        ))}
      </div>
      <div className="executive-chart-grid">
        <article className="premium-panel acquisition-panel">
          <div className="premium-panel-heading">
            <div>
              <span className="premium-eyebrow">CRESCIMENTO DA BASE</span>
              <h3>Novas empresas</h3>
            </div>
            <div className="premium-segment" role="group" aria-label="Período de novas empresas">
              {[6, 12].map((value) => (
                <button
                  key={value}
                  aria-pressed={months === value}
                  onClick={() => setMonths(value)}
                >
                  {value} meses
                </button>
              ))}
            </div>
          </div>
          <div className="chart-big-number">
            <strong>{analytics.acquisition.reduce((sum, point) => sum + point.value, 0)}</strong>
            <span>cadastros no período</span>
          </div>
          <div
            className="premium-chart"
            role="img"
            aria-label={`Novas empresas nos últimos ${months} meses: ${analytics.acquisition.map((p) => `${p.name}: ${p.value}`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.acquisition}
                margin={{ top: 18, right: 15, left: -23, bottom: 4 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id="master-acquisition-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  minTickGap={22}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [value, 'Novas empresas']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#master-acquisition-fill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-footnote">
            Cadastros por mês · não representa histórico de faturamento.
            {analytics.missingDates ? ' Cadastros sem data não entram no gráfico.' : ''}
          </p>
        </article>
        <article className="premium-panel status-panel">
          <div className="premium-panel-heading">
            <div>
              <span className="premium-eyebrow">SAÚDE DA BASE</span>
              <h3>Empresas por status</h3>
            </div>
            <ShieldCheck size={19} />
          </div>
          <div className="status-donut">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={
                    total
                      ? statuses.filter((s) => s.value)
                      : [{ name: 'Sem empresas', value: 1, color: 'var(--border)' }]
                  }
                  dataKey="value"
                  innerRadius={73}
                  outerRadius={88}
                  cornerRadius={5}
                  paddingAngle={total ? 4 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {(total ? statuses.filter((s) => s.value) : [{ color: 'var(--border)' }]).map(
                    (status, index) => (
                      <Cell key={index} fill={status.color} />
                    ),
                  )}
                </Pie>
                {total > 0 && <Tooltip contentStyle={tooltipStyle} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{total}</strong>
              <span>empresas</span>
            </div>
          </div>
          <div className="status-legend">
            {statuses.map((status) => (
              <div key={status.name}>
                <span>
                  <i style={{ background: status.color }} />
                  {status.name}
                </span>
                <b>{status.value}</b>
              </div>
            ))}
          </div>
        </article>
      </div>
      <div className="executive-secondary-grid">
        <article className="premium-panel plans-panel">
          <div className="premium-panel-heading">
            <div>
              <span className="premium-eyebrow">ASSINATURAS</span>
              <h3>Distribuição por plano</h3>
            </div>
            <div className="premium-segment" role="group" aria-label="Métrica por plano">
              <button aria-pressed={planMode === 'revenue'} onClick={() => setPlanMode('revenue')}>
                MRR
              </button>
              <button
                aria-pressed={planMode === 'companies'}
                onClick={() => setPlanMode('companies')}
              >
                Empresas
              </button>
            </div>
          </div>
          <div
            className="plan-chart"
            role="img"
            aria-label={analytics.plans
              .map((p) => `${p.name}: ${planMode === 'revenue' ? money(p.revenue) : p.companies}`)
              .join(', ')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.plans}
                layout="vertical"
                margin={{ left: 0, right: 22, bottom: 5 }}
                accessibilityLayer
              >
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  tickFormatter={(v) => (planMode === 'revenue' ? money(v) : String(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [
                    planMode === 'revenue' ? money(v) : v,
                    planMode === 'revenue' ? 'MRR' : 'Empresas',
                  ]}
                />
                <Bar
                  dataKey={planMode === 'revenue' ? 'revenue' : 'companies'}
                  radius={[0, 6, 6, 0]}
                  barSize={16}
                  isAnimationActive={false}
                >
                  {palette.map((color) => (
                    <Cell key={color} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-footnote">
            MRR inclui empresas ativas com preço definido. Enterprise sob consulta não entra no
            valor.
          </p>
        </article>
        <article className="premium-panel network-panel">
          <span className="premium-eyebrow">ALCANCE DA PLATAFORMA</span>
          <h3>A operação em números</h3>
          <div className="network-stats">
            {[
              {
                title: 'Barbeiros',
                value: metrics?.barbers ?? data.companies.reduce((s, c) => s + c.barbers, 0),
                icon: Scissors,
              },
              {
                title: 'Clientes',
                value: metrics?.clients ?? data.companies.reduce((s, c) => s + c.clients, 0),
                icon: Users,
              },
              { title: 'Agendamentos', value: metrics?.appointments ?? 0, icon: CalendarDays },
            ].map((item) => (
              <div key={item.title}>
                <span className="network-icon">
                  <item.icon size={18} />
                </span>
                <div>
                  <strong>{item.value.toLocaleString('pt-BR')}</strong>
                  <span>{item.title}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="premium-text-link" onClick={() => go('empresas')}>
            Explorar empresas <ArrowRight size={16} />
          </button>
        </article>
      </div>
      {total === 0 && (
        <div className="premium-onboarding">
          <span className="onboarding-icon">
            <Building2 size={26} />
          </span>
          <div>
            <h3>Seu próximo capítulo começa com a primeira empresa.</h3>
            <p>
              Cadastre uma barbearia, configure o plano e entregue uma experiência própria para sua
              equipe e clientes.
            </p>
          </div>
          <Button variant="outline" onClick={createCompany}>
            Cadastrar empresa <ArrowUpRight size={16} />
          </Button>
        </div>
      )}
      {companiesTable}
      <div className="analytics-note">
        <CircleHelp size={16} />
        <p>
          Valores gerenciais, não recebimentos confirmados. ARR é uma projeção; churn considera os
          cancelamentos da base ativa no início do mês.
        </p>
      </div>
    </section>
  );
}
