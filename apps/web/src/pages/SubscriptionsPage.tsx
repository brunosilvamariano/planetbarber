import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Crown,
  UserRound,
  CalendarDays,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientSubscriptions, subscriptionCheckout, subscriptionPortal } from '../lib/data';
import { Button } from '../components/ui/button';
import { money } from '../lib/utils';
interface Plan {
  id: string;
  name: string;
  price_cents: number;
  days: number[];
  barber_name: string;
  services: string[];
}
interface Member {
  id: string;
  name: string;
  plan_id: string;
  paid_until: string | null;
  stripe_status?: string;
  cancel_at_period_end?: boolean;
  next_billing_at?: string;
  recurring_price_cents?: number;
  billing_unavailable?: boolean;
}
export default function SubscriptionsPage() {
  const query = useQuery<{ plans: Plan[]; members: Member[] }>({
    queryKey: ['client-subscriptions'],
    queryFn: clientSubscriptions,
    refetchInterval: 30000,
  });
  const [busy, setBusy] = useState('');
  return (
    <div className="subscriptions-page">
      <div className="subscriptions-intro">
        <span>
          <ShieldCheck size={19} />
        </span>
        <p>
          Assinaturas mensais com renovação automática no cartão. A cobertura só é liberada após
          confirmação do pagamento.
        </p>
      </div>
      {query.isError && <p role="alert">{query.error.message}</p>}
      {query.isPending && <p>Carregando planos…</p>}
      <div className="membership-grid subscriptions-grid">
        {query.data?.plans.map((p) => {
          const member = query.data.members.find((m) => m.plan_id === p.id);
          return (
            <section className="subscription-card" key={p.id}>
              <div className="subscription-card-top">
                <span className="subscription-emblem">
                  <Crown size={22} />
                </span>
                <span className="subscription-label">
                  <RefreshCw size={12} /> Mensal
                </span>
              </div>
              <h2>{p.name}</h2>
              <div className="subscription-price">
                {money(member?.recurring_price_cents ?? p.price_cents)}
                <small>/ mês</small>
              </div>
              <p className="subscription-professional">
                <UserRound size={14} />
                {p.barber_name}
              </p>
              <div className="subscription-benefits">
                <span className="subscription-section-label">SERVIÇOS INCLUÍDOS</span>
                {p.services?.map((service) => (
                  <span className="subscription-service" key={service}>
                    <Check size={14} />
                    {service}
                  </span>
                ))}
              </div>
              <div className="subscription-days">
                <span className="subscription-section-label">
                  <CalendarDays size={13} /> DIAS DO PLANO
                </span>
                <div>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label, d) => (
                    <span key={d} data-included={p.days.includes(d)}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {member ? (
                <div className="subscription-summary">
                  <strong className="subscription-state">
                    {member.paid_until && new Date(member.paid_until) > new Date()
                      ? 'Plano ativo'
                      : 'Cobertura expirada'}
                  </strong>
                  <dl>
                    <div>
                      <dt>Valor mensal</dt>
                      <dd>{money(member.recurring_price_cents ?? p.price_cents)}</dd>
                    </div>
                    <div>
                      <dt>Cobertura paga até</dt>
                      <dd>
                        {member.paid_until
                          ? new Date(member.paid_until).toLocaleString('pt-BR')
                          : 'Aguardando pagamento'}
                      </dd>
                    </div>
                    <div>
                      <dt>Renovação</dt>
                      <dd>
                        {member.billing_unavailable
                          ? 'Consulta temporariamente indisponível'
                          : member.cancel_at_period_end || member.stripe_status === 'canceled'
                            ? 'Cancelada · sem nova cobrança'
                            : member.stripe_status === 'past_due'
                              ? 'Pagamento pendente'
                              : member.next_billing_at
                                ? 'Automática · prevista para ' +
                                  new Date(member.next_billing_at).toLocaleDateString('pt-BR')
                                : 'Aguardando confirmação Stripe'}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy(p.id);
                      try {
                        const result = await subscriptionPortal(member.id);
                        const url = new URL(result.url);
                        if (url.protocol !== 'https:' || url.hostname !== 'billing.stripe.com')
                          throw new Error('Portal inválido');
                        location.assign(result.url);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Portal indisponível');
                        setBusy('');
                      }
                    }}
                  >
                    Gerenciar assinatura <ArrowUpRight size={17} />
                  </Button>
                  <p>
                    Consulte faturas, atualize o cartão e veja as opções de cancelamento no portal
                    Stripe.
                  </p>
                </div>
              ) : (
                <Button
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy(p.id);
                    try {
                      const result = await subscriptionCheckout(p.id);
                      const url = new URL(result.url);
                      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
                        throw new Error('Checkout inválido.');
                      location.assign(result.url);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Falha no checkout');
                      setBusy('');
                    }
                  }}
                >
                  {busy === p.id ? 'Abrindo checkout…' : 'Assinar plano'}
                  <ArrowRight size={17} />
                </Button>
              )}
            </section>
          );
        })}
      </div>
      {query.isSuccess && !query.data.plans.length && <p>A barbearia ainda não publicou planos.</p>}
    </div>
  );
}
