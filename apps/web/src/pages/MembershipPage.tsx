import { connectStripe } from '../lib/data';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { memberships, createMonthlyPlan, type Snapshot } from '../lib/data';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, Field } from '../components/shared';
import { money } from '../lib/utils';
interface Plan {
  id: string;
  name: string;
  price_cents: number;
  days: number[];
  barber_id: string;
  services: { service_id: string; outside_price_cents: number | null }[];
}
export default function MembershipPage({
  data,
  canConnect,
}: {
  data: Snapshot;
  canConnect: boolean;
}) {
  const qc = useQueryClient();
  const query = useQuery<{ plans: Plan[]; members: any[] }>({
    queryKey: ['memberships'],
    queryFn: memberships,
  });
  const [name, setName] = useState(''),
    [price, setPrice] = useState('140'),
    [barber, setBarber] = useState(data.barbers[0]?.id || ''),
    [days, setDays] = useState<number[]>([1, 2, 3, 4]),
    [services, setServices] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  const save = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Salvo.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="membership-page">
      {canConnect && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await connectStripe();
              const url = new URL(result.url);
              if (url.protocol !== 'https:' || !url.hostname.endsWith('.stripe.com'))
                throw new Error('Link inválido');
              location.assign(result.url);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Falha na conexão');
              setBusy(false);
            }
          }}
        >
          Conectar recebimentos à Stripe
        </Button>
      )}
      <p>
        Uso ilimitado nos dias permitidos, sujeito à disponibilidade. A mensalidade é registrada no
        plano; a assinatura é paga pelo cliente no checkout Stripe.
      </p>
      {query.isError && <p role="alert">{query.error.message}</p>}
      <div className="membership-grid">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!days.length || !Object.keys(services).length) {
              toast.error('Selecione dias e serviços.');
              return;
            }
            void save(() =>
              createMonthlyPlan({
                name,
                barberId: barber,
                priceCents: Math.round(Number(price) * 100),
                days,
                services: Object.entries(services).map(([serviceId, value]) => ({
                  serviceId,
                  outsidePriceCents: value === '' ? null : Math.round(Number(value) * 100),
                })),
              }),
            );
          }}
        >
          <h2>Criar plano mensal</h2>
          <Field label="Nome">
            <Input
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Mensalidade (R$)">
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Profissional">
            <Select required value={barber} onChange={(e) => setBarber(e.target.value)}>
              {data.barbers.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend>Dias incluídos</legend>
            <div className="membership-days">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label, i) => (
                <label key={i}>
                  <input
                    type="checkbox"
                    checked={days.includes(i)}
                    onChange={(e) =>
                      setDays(e.target.checked ? [...days, i] : days.filter((d) => d !== i))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Serviços e preço fora dos dias incluídos</legend>
            {data.services
              .filter((s) => s.active)
              .map((s) => (
                <div className="membership-service" key={s.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={s.id in services}
                      onChange={(e) =>
                        setServices((old) => {
                          const next = { ...old };
                          if (e.target.checked) next[s.id] = '';
                          else delete next[s.id];
                          return next;
                        })
                      }
                    />
                    {s.name}
                  </label>
                  {s.id in services && (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={'Preço fora do plano para ' + s.name}
                      placeholder={'Avulso: ' + money(s.priceCents)}
                      value={services[s.id]}
                      onChange={(e) => setServices({ ...services, [s.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
          </fieldset>
          <Button disabled={busy}>Criar plano</Button>
        </form>
        <section>
          <h2>Planos cadastrados</h2>
          {query.data?.plans.map((p) => (
            <article key={p.id}>
              <h3>
                {p.name} · {money(p.price_cents)}/mês
              </h3>
              <p>
                {p.days
                  .map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d])
                  .join(' · ')}
              </p>
              <p>
                {p.services
                  ?.map((s) => data.services.find((x) => x.id === s.service_id)?.name)
                  .join(', ')}
              </p>
              <small>Profissional: {data.barbers.find((b) => b.id === p.barber_id)?.name}</small>
            </article>
          ))}
          <p>
            O cliente escolhe e paga pelo plano em Meus planos. A ativação é automática após
            confirmação Stripe.
          </p>
          {query.data?.members.map((m) => (
            <p key={m.id}>
              {data.clients.find((c) => c.id === m.client_id)?.name} ·{' '}
              {query.data.plans.find((p) => p.id === m.plan_id)?.name} ·{' '}
              {String(m.starts_on).slice(0, 10)} a {String(m.ends_on).slice(0, 10)}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}
