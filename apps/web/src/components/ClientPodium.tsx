import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trophy, Gift } from 'lucide-react';
import {
  appointmentsInRange,
  listRewards,
  createReward,
  deliverReward,
  type Role,
} from '../lib/data';
import { monthBounds } from '../lib/calendar';
import { Button } from './ui/button';
import { Input } from './ui/input';
export function ClientPodium({ role, barberId }: { role: Role; barberId?: string }) {
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const [clientId, setClientId] = useState(''),
    [gift, setGift] = useState(''),
    [busy, setBusy] = useState(false);
  const qc = useQueryClient(),
    bounds = monthBounds(month);
  const apps = useQuery({
    queryKey: ['ranking', month],
    queryFn: () => appointmentsInRange(bounds.from, bounds.to),
  });
  const rewards = useQuery<
    { id: string; clientId: string; description: string; delivered: boolean }[]
  >({ queryKey: ['rewards'], queryFn: listRewards });
  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const a of apps.data || []) {
    if (a.status !== 'FINALIZADO' || (role === 'BARBEIRO' && a.barberId !== barberId)) continue;
    const row = counts.get(a.clientId) || { id: a.clientId, name: a.client.name, count: 0 };
    row.count++;
    counts.set(a.clientId, row);
  }
  const ranking = [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
  return (
    <section className="client-podium">
      <header>
        <div>
          <Trophy size={24} />
          <h2>Clientes em destaque</h2>
          <p>Atendimentos concluídos no mês · empates em ordem alfabética.</p>
        </div>
        <Input
          aria-label="Mês do ranking"
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </header>
      {apps.isError && <p role="alert">Não foi possível carregar o ranking.</p>}
      {apps.isPending && <p>Carregando ranking…</p>}
      <div className="podium-list">
        {ranking.map((c, i) => (
          <article key={c.id} data-top={i < 3}>
            <span className="podium-position">{i + 1}º</span>
            <div>
              <strong>{c.name}</strong>
              <small>{c.count} atendimentos</small>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setClientId(c.id);
                setGift('');
              }}
            >
              <Gift size={15} />
              Presentear
            </Button>
          </article>
        ))}
      </div>
      {apps.isSuccess && !ranking.length && <p>Nenhum atendimento concluído neste mês.</p>}
      {clientId && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              await createReward(clientId, gift);
              await qc.invalidateQueries({ queryKey: ['rewards'] });
              setClientId('');
              toast.success('Presente registrado.');
            } catch {
              toast.error('Não foi possível registrar o presente.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Presente para {ranking.find((c) => c.id === clientId)?.name}
            <Input
              required
              minLength={2}
              maxLength={200}
              value={gift}
              onChange={(e) => setGift(e.target.value)}
              placeholder="Ex.: pomada modeladora"
            />
          </label>
          <Button disabled={busy}>Registrar presente</Button>
        </form>
      )}
      <div className="reward-list">
        {rewards.data?.map((r) => (
          <div key={r.id}>
            <span>
              {ranking.find((c) => c.id === r.clientId)?.name || 'Cliente'} · {r.description}
            </span>
            {r.delivered ? (
              <small>Entregue</small>
            ) : (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await deliverReward(r.id);
                    await qc.invalidateQueries({ queryKey: ['rewards'] });
                  } catch {
                    toast.error('Falha ao confirmar entrega.');
                  }
                }}
              >
                Confirmar entrega
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
