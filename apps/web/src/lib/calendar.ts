export function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function shiftDate(day: string, days: number) {
  const d = new Date(day + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
export function monthBounds(month: string) {
  const d = new Date(month + '-01T12:00:00');
  return { from: month + '-01', to: dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) };
}
export function appointmentDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
