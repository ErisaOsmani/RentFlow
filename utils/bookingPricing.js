export const getBillingMonthCount = (startDateValue, endDateValue) => {
  const start = parseDateKey(startDateValue);
  const end = parseDateKey(endDateValue);

  if (!start || !end || end <= start) {
    return 0;
  }

  const monthDiff =
    (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  const wholeMonths = Math.max(0, monthDiff - (end.getDate() < start.getDate() ? 1 : 0));
  const monthAnchor = addCalendarMonths(start, wholeMonths);
  const hasExtraDays = end > monthAnchor;

  return wholeMonths + (hasExtraDays ? 1 : 0);
};

export const getMonthlyBookingTotal = (monthlyPrice, startDateValue, endDateValue) => {
  const monthCount = getBillingMonthCount(startDateValue, endDateValue);

  return monthCount * Number(monthlyPrice || 0);
};

const parseDateKey = (dateKey) => {
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = String(dateKey).split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
};

const addCalendarMonths = (date, monthsToAdd) => {
  const year = date.getFullYear();
  const month = date.getMonth() + monthsToAdd;
  const day = date.getDate();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfTargetMonth));
};
