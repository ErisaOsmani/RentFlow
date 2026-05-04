export const getBillingMonthCount = (startDateValue, endDateValue) => {
  const start = new Date(startDateValue);
  const end = new Date(endDateValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return days > 0 ? Math.ceil(days / 30) : 0;
};

export const getMonthlyBookingTotal = (monthlyPrice, startDateValue, endDateValue) => {
  const monthCount = getBillingMonthCount(startDateValue, endDateValue);

  return monthCount * Number(monthlyPrice || 0);
};
