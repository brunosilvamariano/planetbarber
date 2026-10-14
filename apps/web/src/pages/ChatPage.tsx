import { Input } from '../components/ui/input';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  chatAppointments,
  chatMessages,
  sendChatMessage,
  type Appointment,
  type Role,
} from '../lib/data';
import { Button } from '../components/ui/button';
export default function ChatPage({ role, initialId }: { role: Role; initialId?: string }) {
  const [id, setId] = useState(initialId || ''),
    [body, setBody] = useState(''),
    [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const qc = useQueryClient();
  const apps = useQuery<Appointment[]>({
    queryKey: ['chat-appointments'],
    queryFn: chatAppointments,
  });
  const messages = useQuery<{ id: string; body: string; senderRole: Role; createdAt: string }[]>({
    queryKey: ['chat-messages', id],
    queryFn: () => chatMessages(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
  const conversations =
    apps.data?.filter((a) =>
      normalize(role === 'CLIENTE' ? a.barber.name : a.client.name).includes(
        normalize(search.trim()),
      ),
    ) || [];
  const app = apps.data?.find((a) => a.id === id);
  let phone = app?.client.phone.replace(/\D/g, '') || '';
  if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
  return (
    <div className="chat-workspace">
      <aside>
        <h2>Conversas por agendamento</h2>
        <Input
          type="search"
          aria-label="Pesquisar conversas por nome"
          placeholder={role === 'CLIENTE' ? 'Buscar barbeiro…' : 'Buscar cliente…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {apps.isSuccess && conversations.length === 0 && (
          <p role="status" className="chat-search-empty">
            Nenhuma conversa encontrada.
          </p>
        )}
        {apps.isError && <p role="alert">{apps.error.message}</p>}
        {conversations.map((a) => (
          <button
            key={a.id}
            aria-pressed={id === a.id}
            onClick={() => {
              setId(a.id);
              setBody('');
            }}
          >
            <strong>{role === 'CLIENTE' ? a.barber.name : a.client.name}</strong>
            <small>
              {a.service.name} · {new Date(a.startsAt).toLocaleDateString('pt-BR')}
            </small>
          </button>
        ))}
      </aside>
      <section>
        <h2>
          {app
            ? role === 'CLIENTE'
              ? app.barber.name
              : app.client.name
            : 'Selecione um agendamento'}
        </h2>
        <p>Chat interno · o cliente responde pela conta no PlanetBarber.</p>
        {id && (
          <>
            <div className="chat-messages" aria-label="Mensagens" tabIndex={0}>
              {messages.isPending && <p>Carregando…</p>}
              {messages.isError && <p role="alert">Não foi possível carregar mensagens.</p>}
              {messages.data
                ?.slice()
                .reverse()
                .map((m) => (
                  <article
                    key={m.id}
                    data-own={(m.senderRole === 'CLIENTE') === (role === 'CLIENTE')}
                  >
                    <small>
                      {m.senderRole === 'CLIENTE' ? 'Cliente' : 'Equipe'} ·{' '}
                      {new Date(m.createdAt).toLocaleString('pt-BR')}
                    </small>
                    <p>{m.body}</p>
                  </article>
                ))}
              {messages.isSuccess && !messages.data?.length && <p>Comece a conversa por aqui.</p>}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy || !body.trim()) return;
                setBusy(true);
                try {
                  await sendChatMessage(id, body);
                  setBody('');
                  await qc.invalidateQueries({ queryKey: ['chat-messages', id] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Falha no envio');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Mensagem
                <textarea
                  required
                  maxLength={2000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={busy}
                />
              </label>
              <Button disabled={busy || !body.trim()}>Enviar no chat</Button>
              {role !== 'CLIENTE' && /^[1-9]\d{10,14}$/.test(phone) && body.trim() && (
                <a
                  className="chat-whatsapp"
                  href={'https://wa.me/' + phone + '?text=' + encodeURIComponent(body.trim())}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir WhatsApp com esta mensagem
                </a>
              )}
              <small>No WhatsApp, confirme o envio. As respostas ficam no WhatsApp.</small>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
