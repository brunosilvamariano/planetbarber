import { useState } from 'react';
import { Popover } from 'radix-ui';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey } from '../lib/calendar';
export function MonthCalendar({
  value,
  onChange,
  counts = {},
  month,
  onMonthChange,
}: {
  value: string;
  onChange: (day: string) => void;
  counts?: Record<string, number>;
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const first = new Date(month + '-01T12:00:00');
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const move = (offset: number) =>
    onMonthChange(
      dateKey(new Date(first.getFullYear(), first.getMonth() + offset, 1, 12)).slice(0, 7),
    );
  const today = dateKey(new Date());
  return (
    <div className="month-calendar">
      <div className="month-heading">
        <button type="button" aria-label="Mês anterior" onClick={() => move(-1)}>
          <ChevronLeft size={18} />
        </button>
        <strong aria-live="polite">
          {first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </strong>
        <button type="button" aria-label="Próximo mês" onClick={() => move(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="month-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: first.getDay() }, (_, i) => (
          <span key={'empty' + i} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const day = month + '-' + String(i + 1).padStart(2, '0');
          return (
            <button
              type="button"
              key={day}
              aria-label={day + (counts[day] ? ', ' + counts[day] + ' agendamentos' : '')}
              aria-pressed={value === day}
              aria-current={today === day ? 'date' : undefined}
              onClick={() => onChange(day)}
            >
              <span>{i + 1}</span>
              {counts[day] > 0 && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="calendar-today"
        onClick={() => {
          onMonthChange(today.slice(0, 7));
          onChange(today);
        }}
      >
        Voltar para hoje
      </button>
    </div>
  );
}
export function DatePicker({
  value,
  onChange,
  label = 'Escolher data',
}: {
  value: string;
  onChange: (day: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(value.slice(0, 7));
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMonth(value.slice(0, 7));
      }}
    >
      <Popover.Trigger className="date-picker-trigger" aria-label={label}>
        <CalendarDays size={16} />
        {new Date(value + 'T12:00:00').toLocaleDateString('pt-BR')}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="date-picker-popover"
          sideOffset={8}
          collisionPadding={12}
          aria-label={label}
        >
          <label className="calendar-date-input">
            Ir para uma data
            <input
              type="date"
              value={value}
              onChange={(e) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
                  onChange(e.target.value);
                  setMonth(e.target.value.slice(0, 7));
                }
              }}
            />
          </label>
          <MonthCalendar
            value={value}
            month={month}
            onMonthChange={setMonth}
            onChange={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
