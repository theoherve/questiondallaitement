import {
  addMinutes,
  format,
  startOfDay,
  eachDayOfInterval,
  getDay,
  isBefore,
  isAfter,
  areIntervalsOverlapping,
} from "date-fns";

type AvailabilityRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type ExceptionRow = {
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
};

type BookingRow = {
  starts_at: string;
  ends_at: string;
};

export type TimeSlot = {
  start: Date;
  end: Date;
};

const parseTime = (timeStr: string, day: Date): Date => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = startOfDay(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const computeAvailableSlots = ({
  date,
  availabilities,
  exceptions,
  existingBookings,
  durationMinutes,
  bufferMinutes,
}: {
  date: Date;
  availabilities: AvailabilityRow[];
  exceptions: ExceptionRow[];
  existingBookings: BookingRow[];
  durationMinutes: number;
  bufferMinutes: number;
}): TimeSlot[] => {
  const dayOfWeek = getDay(date);
  const dateStr = format(date, "yyyy-MM-dd");

  const exception = exceptions.find((e) => e.date === dateStr);

  let rawWindows: { start: Date; end: Date }[] = [];

  if (exception) {
    if (!exception.is_available) return [];
    if (exception.start_time && exception.end_time) {
      rawWindows = [
        {
          start: parseTime(exception.start_time, date),
          end: parseTime(exception.end_time, date),
        },
      ];
    }
  }

  if (rawWindows.length === 0 && !exception) {
    const dayAvails = availabilities.filter(
      (a) => a.day_of_week === dayOfWeek && a.is_active,
    );
    rawWindows = dayAvails
      .map((a) => ({
        start: parseTime(a.start_time, date),
        end: parseTime(a.end_time, date),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  if (rawWindows.length === 0) return [];

  const bookedIntervals = existingBookings.map((b) => ({
    start: new Date(b.starts_at),
    end: addMinutes(new Date(b.ends_at), bufferMinutes),
  }));

  const now = new Date();
  const slots: TimeSlot[] = [];

  for (const window of rawWindows) {
    let cursor = window.start;

    while (true) {
      const slotEnd = addMinutes(cursor, durationMinutes);

      if (isAfter(slotEnd, window.end)) break;

      if (isBefore(cursor, now)) {
        cursor = addMinutes(cursor, 15);
        continue;
      }

      const slotWithBuffer = {
        start: cursor,
        end: addMinutes(slotEnd, bufferMinutes),
      };

      const hasConflict = bookedIntervals.some((booked) =>
        areIntervalsOverlapping(
          { start: cursor, end: slotWithBuffer.end },
          { start: booked.start, end: booked.end },
        ),
      );

      if (!hasConflict) {
        slots.push({ start: cursor, end: slotEnd });
      }

      cursor = addMinutes(cursor, 15);
    }
  }

  return slots;
};

export const getAvailableDates = ({
  startDate,
  endDate,
  availabilities,
  exceptions,
}: {
  startDate: Date;
  endDate: Date;
  availabilities: AvailabilityRow[];
  exceptions: ExceptionRow[];
}): Date[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days.filter((day) => {
    const dayOfWeek = getDay(day);
    const dateStr = format(day, "yyyy-MM-dd");

    const exception = exceptions.find((e) => e.date === dateStr);
    if (exception) return exception.is_available;

    return availabilities.some(
      (a) => a.day_of_week === dayOfWeek && a.is_active,
    );
  });
};
