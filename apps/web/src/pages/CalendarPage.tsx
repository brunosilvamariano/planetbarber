import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock3, ChevronRight } from 'lucide-react';
import { appointmentsInRange, today, type Appointment } from '../lib/data';
import { appointmentDate, monthBounds } from '../lib/calendar';
import { MonthCalendar, DatePicker } from '../components/DatePicker';
import { Badge } from '../components/shared';
import { Button } from '../components/ui/button';
import { timeLabel } from '../lib/utils';
export default function CalendarPage({
  unitId,
  barberId,
  onDetails,
}: {
  unitId: string;
  barberId?: string;
  onDetails: (a: Appointment) => void;
}) {
  const [day, setDay] = useState(today),
    [month, setMonth] = useState(today.slice(0, 7));
  const bounds = monthBounds(month);
  const query = useQuery({
    queryKey: ['calendar', bounds.from, bounds.to],
    queryFn: () => appointmentsInRange(bounds.from, bounds.to),
  });
  const rows = (query.data || []).filter(
    (a) => (!unitId || a.barber.unitId === unitId) && (!barberId || a.barberId === barberId),
  );
  const counts: Record<string, number> = {};
  rows.forEach((a) => {
    const key = appointmentDate(a.startsAt);
    counts[key] = (counts[key] || 0) + 1;
  });
  const selected = rows
    .filter((a) => appointmentDate(a.startsAt) === day)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const choose = (date: string) => {
    setDay(date);
    setMonth(date.slice(0, 7));
  };
  return (
    <div className="calendar-workspace">
      <section className="calendar-month-panel">
        <div className="calendar-panel-title">
          <CalendarDays size={20} />
          <div>
            <h2>Seu calendário</h2>
            <p>Escolha o dia para ver os horários.</p>
          </div>
        </div>
        <MonthCalendar
          value={day}
          month={month}
          counts={counts}
          onChange={choose}
          onMonthChange={(m) => {
            setMonth(m);
            setDay(m + '-01');
          }}
        />
        <p className="calendar-legend">
          <i /> Dias com agendamentos
        </p>
      </section>
      <section className="calendar-day-panel">
        <header>
          <div>
            <span className="companies-eyebrow">AGENDA DO DIA</span>
            <h2>
              {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
            <p>{query.isSuccess ? selected.length + ' agendamentos' : 'Consultando agenda'}</p>
          </div>
          <DatePicker value={day} onChange={choose} />
        </header>
        {query.isPending && (
          <p role="status" className="calendar-empty">
            Carregando agendamentos…
          </p>
        )}
        {query.isError && (
          <div role="alert" className="calendar-empty">
            <p>Não foi possível carregar este período.</p>
            <Button onClick={() => query.refetch()}>Tentar novamente</Button>
          </div>
        )}
        {query.isSuccess && (
          <div className="calendar-appointments" tabIndex={0} aria-label="Agendamentos do dia">
            {selected.length === 0 && (
              <div className="calendar-empty">
                <CalendarDays size={30} />
                <h3>Dia livre por aqui</h3>
                <p>Nenhum agendamento para esta data.</p>
              </div>
            )}
            {selected.map((a) => (
              <article className="calendar-appointment" key={a.id}>
                <div className="calendar-time">
                  <Clock3 size={15} />
                  <strong>{timeLabel(a.startsAt)}</strong>
                  <small>{timeLabel(a.endsAt)}</small>
                </div>
                <div className="calendar-appointment-info">
                  <h3>{a.client.name}</h3>
                  <p>
                    {a.service.name} · {a.barber.name}
                  </p>
                  <Badge status={a.status} />
                </div>
                <Button
                  variant="outline"
                  onClick={() => onDetails(a)}
                  aria-label={'Detalhes de ' + a.client.name}
                >
                  Detalhes
                  <ChevronRight size={16} />
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
