import "server-only";

export const INTERNSHIP_DURATIONS = ["1 Month", "2 Months", "3 Months"] as const;
export type InternshipDuration = typeof INTERNSHIP_DURATIONS[number];

/**
 * Business policy: Crewline dates are calendar dates in Asia/Kolkata. We store
 * the selected calendar date as a UTC-midnight sentinel and always format it
 * back in UTC, avoiding machine-local timezone shifts. Month-end additions
 * clamp to the last valid day (Jan 31 + 1 month => Feb 28/29).
 */
export function calculateInternshipDates(startDate: string, duration: InternshipDuration) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error("Choose a valid internship start date.");
  if (!(INTERNSHIP_DURATIONS as readonly string[]).includes(duration)) throw new Error("Choose a supported internship duration.");
  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) throw new Error("Choose a valid internship start date.");
  const months = duration === "1 Month" ? 1 : duration === "2 Months" ? 2 : 3;
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const targetDay = Math.min(day, new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate());
  const end = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
  const deadline = new Date(end);
  deadline.setUTCDate(deadline.getUTCDate() - 2);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    submissionDeadlineAt: deadline.toISOString(),
  };
}

export function formatCrewlineDate(value: string | Date | null | undefined) {
  if (!value) return "Not set";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

