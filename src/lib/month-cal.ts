export const WEEKDAYS_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  const dow = (first.getDay() + 6) % 7; // Mon=0
  start.setDate(1 - dow);
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export function formatDayLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
