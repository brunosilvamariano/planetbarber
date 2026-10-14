import { Copy, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { companyAccess, resetManagerPassword } from '../lib/data';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Field } from './shared';

export function CompanyAccessDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['company-access', id],
    queryFn: () => companyAccess(id),
    retry: false,
  });
  const [managerId, setManagerId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const manager = query.data?.managers.find((m) => m.id === managerId);
  const url = query.data
    ? location.origin + '/app?empresa=' + encodeURIComponent(query.data.slug)
    : '';
  return (
    <Dialog
      open
      className="access-dialog"
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title="Gerenciar acesso"
      description={query.data?.name || 'Dados do gestor da barbearia.'}
    >
      <div className="access-emblem" aria-hidden="true">
        <ShieldCheck size={23} />
      </div>
      {query.isPending && <p role="status">Carregando gestores…</p>}
      {query.isError && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => query.refetch()}>Tentar novamente</Button>
        </div>
      )}
      {query.data && (
        <div className="access-body space-y-5">
          <div className="access-link-panel">
            <Field label="Link de acesso da equipe">
              <Input readOnly value={url} onFocus={(e) => e.target.select()} />
            </Field>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success('Link copiado.');
                } catch {
                  toast.error('Selecione o link acima e copie manualmente.');
                }
              }}
            >
              <Copy size={15} /> Copiar link
            </Button>
          </div>
          <div className="space-y-3">
            {query.data.managers.length === 0 && <p>Nenhum gestor cadastrado nesta barbearia.</p>}
            {query.data.managers.map((m) => (
              <div key={m.id} className="access-manager">
                <div className="access-manager-heading">
                  <span className="access-avatar">
                    <UserRound size={20} />
                  </span>
                  <strong>{m.name}</strong>
                </div>
                <p className="break-all">{m.email}</p>
                <p className="access-status" data-active={m.active}>
                  {m.active ? 'Gestor ativo' : 'Gestor inativo'}
                </p>
                <Button
                  variant="outline"
                  disabled={!m.active || busy}
                  onClick={() => {
                    setManagerId(m.id);
                    setPassword('');
                    setConfirmation('');
                  }}
                >
                  <KeyRound size={15} /> Redefinir senha
                </Button>
              </div>
            ))}
          </div>
          {manager && (
            <form
              className="access-reset space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                if (password !== confirmation) {
                  toast.error('As senhas não coincidem.');
                  return;
                }
                setBusy(true);
                try {
                  await resetManagerPassword(id, managerId, password);
                  setPassword('');
                  setConfirmation('');
                  setManagerId('');
                  toast.success('Senha redefinida. Compartilhe a nova senha com o gestor.');
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Não foi possível redefinir a senha.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p>
                Nova senha para <strong>{manager.email}</strong>
              </p>
              <Field label="Nova senha (mínimo 12 caracteres)">
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Confirmar nova senha">
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={confirmation}
                  disabled={busy}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </Field>
              <p className="text-sm text-muted-foreground">
                A senha anterior será substituída. Sessões existentes deixam de ser renovadas e
                expiram em até 15 minutos.
              </p>
              <Button type="submit" disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </form>
          )}
        </div>
      )}
    </Dialog>
  );
}
