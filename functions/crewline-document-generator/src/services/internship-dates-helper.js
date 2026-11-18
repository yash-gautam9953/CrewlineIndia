export const INTERNSHIP_DURATIONS = ["1 Month", "2 Months", "3 Months"];

/**
 * Calculates startAt, endAt, and submissionDeadlineAt in UTC.
 * Clamps month-end additions safely.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} duration - "1 Month" | "2 Months" | "3 Months"
 * @returns {{ startAt: string, endAt: string, submissionDeadlineAt: string }}
 */
export function calculateInternshipDates(startDate, duration) {
  const cleanDate = typeof startDate === "string" ? startDate.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    throw new Error("Choose a valid internship start date (YYYY-MM-DD).");
  }

  const validDuration = INTERNSHIP_DURATIONS.includes(duration) ? duration : "1 Month";
  const [year, month, day] = cleanDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));

  const months = validDuration === "1 Month" ? 1 : validDuration === "2 Months" ? 2 : 3;
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, maxDaysInTargetMonth);
  const end = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));

  const deadline = new Date(end);
  deadline.setUTCDate(deadline.getUTCDate() - 2);

  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    submissionDeadlineAt: deadline.toISOString(),
  };
}
