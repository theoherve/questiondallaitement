export type CalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  /** ISO 8601, UTC (as stored in DB — see paris-time.ts) */
  startsAt: string;
  endsAt: string;
  /** Unique id used as UID/filename, e.g. the booking or formation id. */
  uid: string;
};

/** yyyyMMdd'T'HHmmss'Z', the UTC format every calendar format below expects. */
const toUtcStamp = (isoDate: string): string =>
  new Date(isoDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

/** Escapes text per RFC 5545 §3.3.11 (comma, semicolon, backslash, newline). */
const escapeIcsText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

/** Folds lines >75 octets per RFC 5545 §3.1, required by some strict parsers (Outlook). */
const foldLine = (line: string): string => {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n");
};

export const buildIcsContent = (event: CalendarEventInput): string => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Question d'Allaitement//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@question-d-allaitement.fr`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${toUtcStamp(event.startsAt)}`,
    `DTEND:${toUtcStamp(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n");
};

export const buildGoogleCalendarUrl = (event: CalendarEventInput): string => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toUtcStamp(event.startsAt)}/${toUtcStamp(event.endsAt)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/** Triggers a browser download of the event as a .ics file (Apple Calendar, Outlook, ...). */
export const downloadIcsFile = (event: CalendarEventInput): void => {
  const blob = new Blob([buildIcsContent(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.uid}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
