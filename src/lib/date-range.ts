/**
 * Compute date range from a period key.
 */
export const getDateRange = (
  period: string,
): { start: Date; end: Date; groupBy: "day" | "month" } => {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "90d":
      start.setDate(start.getDate() - 90);
      return { start, end, groupBy: "day" };
    case "12m":
      start.setMonth(start.getMonth() - 12);
      return { start, end, groupBy: "month" };
    case "30d":
    default:
      start.setDate(start.getDate() - 30);
      return { start, end, groupBy: "day" };
  }
};
