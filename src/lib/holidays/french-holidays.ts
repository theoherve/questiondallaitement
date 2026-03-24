/**
 * French public holidays computation.
 *
 * 8 fixed holidays + 3 Easter-dependent holidays.
 * Easter is computed via the Anonymous Gregorian algorithm.
 */

const computeEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getFrenchHolidays = (year: number): Date[] => {
  const easter = computeEasterSunday(year);

  return [
    // Fixed holidays
    new Date(year, 0, 1), // Jour de l'an
    new Date(year, 4, 1), // Fête du Travail
    new Date(year, 4, 8), // Victoire 1945
    new Date(year, 6, 14), // Fête nationale
    new Date(year, 7, 15), // Assomption
    new Date(year, 10, 1), // Toussaint
    new Date(year, 10, 11), // Armistice
    new Date(year, 11, 25), // Noël
    // Easter-dependent
    addDays(easter, 1), // Lundi de Pâques
    addDays(easter, 39), // Ascension
    addDays(easter, 50), // Lundi de Pentecôte
  ];
};

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const holidayCache = new Map<number, Set<string>>();

const getHolidaySet = (year: number): Set<string> => {
  if (!holidayCache.has(year)) {
    holidayCache.set(
      year,
      new Set(getFrenchHolidays(year).map(toDateKey))
    );
  }
  return holidayCache.get(year)!;
};

export const isFrenchHoliday = (date: Date): boolean => {
  return getHolidaySet(date.getFullYear()).has(toDateKey(date));
};

export const isWeekendOrHoliday = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6 || isFrenchHoliday(date);
};
