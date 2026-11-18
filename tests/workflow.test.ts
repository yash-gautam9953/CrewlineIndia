import assert from "node:assert/strict";
import test from "node:test";
import { calculateInternshipDates, INTERNSHIP_DURATIONS } from "../src/lib/internship-dates";

const syntheticStudents = Array.from({ length: 10 }, (_, index) => ({
  id: `synthetic-student-${String(index + 1).padStart(2, "0")}`,
  startDate: ["2026-01-31", "2026-02-28", "2026-03-15", "2026-04-30", "2026-05-31", "2026-06-01", "2026-07-31", "2026-08-14", "2026-09-30", "2026-10-31"][index],
  duration: INTERNSHIP_DURATIONS[index % INTERNSHIP_DURATIONS.length],
}));

test("schedule calculation handles 10 synthetic student applications without Appwrite or email calls", () => {
  for (const student of syntheticStudents) {
    const result = calculateInternshipDates(student.startDate, student.duration);
    assert.equal(result.startAt, `${student.startDate}T00:00:00.000Z`, student.id);
    const end = new Date(result.endAt);
    const deadline = new Date(result.submissionDeadlineAt);
    assert.equal((end.getTime() - deadline.getTime()) / 86_400_000, 2, student.id);
    assert.equal(result.endAt.slice(11), "00:00:00.000Z", student.id);
  }
});

test("month-end and leap-year dates clamp to the final calendar day of the target month", () => {
  assert.equal(calculateInternshipDates("2026-01-31", "1 Month").endAt, "2026-02-28T00:00:00.000Z");
  assert.equal(calculateInternshipDates("2028-01-31", "1 Month").endAt, "2028-02-29T00:00:00.000Z");
  assert.equal(calculateInternshipDates("2026-12-31", "2 Months").endAt, "2027-02-28T00:00:00.000Z");
});

test("invalid calendar dates and unsupported durations are rejected", () => {
  assert.throws(() => calculateInternshipDates("2026-02-30", "1 Month"));
  assert.throws(() => calculateInternshipDates("2026-03-01", "4 Months" as (typeof INTERNSHIP_DURATIONS)[number]));
});
