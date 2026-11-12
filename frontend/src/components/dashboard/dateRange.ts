export function calendarRange(endDate: string, days: number): { startDate: string; endDate: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endDate)
  if (!match) return { startDate: endDate, endDate }
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(end.getTime())) return { startDate: endDate, endDate }
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - Math.max(1, Math.min(90, days)) + 1)
  const asDate = (value: Date) => value.toISOString().slice(0, 10)
  return { startDate: asDate(start), endDate: asDate(end) }
}
