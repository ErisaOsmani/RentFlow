import React, { useMemo, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getMonthDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
};

export default function DateRangeCalendar({ startDate, endDate, onChange, unavailableRanges = [] }) {
  const initialMonth = parseDateKey(startDate) || new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
  );

  const todayKey = toDateKey(new Date());
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const bookedRanges = useMemo(
    () =>
      unavailableRanges
        .filter((range) => range?.start_date && range?.end_date)
        .map((range) => ({ start: range.start_date, end: range.end_date })),
    [unavailableRanges]
  );

  const isBookedDate = (dateKey) =>
    bookedRanges.some((range) => dateKey >= range.start && dateKey < range.end);

  const rangeHasBookedDate = (rangeStart, rangeEnd) =>
    bookedRanges.some((range) => rangeStart < range.end && rangeEnd > range.start);

  const goToPreviousMonth = () => {
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const selectDate = (date) => {
    const nextDate = toDateKey(date);

    if (isBookedDate(nextDate)) {
      return;
    }

    if (!startDate || (startDate && endDate) || nextDate < startDate) {
      onChange(nextDate, '');
      return;
    }

    if (nextDate === startDate) {
      onChange(startDate, '');
      return;
    }

    if (rangeHasBookedDate(startDate, nextDate)) {
      Alert.alert('Datat nuk jane te lira', 'Zgjidh nje periudhe qe nuk prek rezervimet ekzistuese.');
      return;
    }

    onChange(startDate, nextDate);
  };

  return (
    <View style={styles.calendar}>
      <View style={styles.selectedRow}>
        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>Check-in</Text>
          <Text style={styles.selectedValue}>{startDate || 'Choose date'}</Text>
        </View>
        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>Check-out</Text>
          <Text style={styles.selectedValue}>{endDate || 'Choose date'}</Text>
        </View>
      </View>

      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousMonth}>
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </Text>
        <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}>
          <Text style={styles.navButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {dayNames.map((dayName) => (
          <Text key={dayName} style={styles.weekDay}>
            {dayName}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {monthDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateKey = toDateKey(date);
          const isBooked = isBookedDate(dateKey);
          const wouldCrossBookedRange = Boolean(
            startDate && !endDate && dateKey > startDate && rangeHasBookedDate(startDate, dateKey)
          );
          const isDisabled = Boolean(dateKey < todayKey || isBooked || wouldCrossBookedRange);
          const isStart = dateKey === startDate;
          const isEnd = dateKey === endDate;
          const isInRange = startDate && endDate && dateKey > startDate && dateKey < endDate;

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                styles.dayCell,
                isInRange && styles.rangeDay,
                isBooked && styles.bookedDay,
                (isStart || isEnd) && styles.selectedDay,
                isDisabled && styles.disabledDay,
              ]}
              onPress={() => selectDate(date)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.dayText,
                  isInRange && styles.rangeDayText,
                  isBooked && styles.bookedDayText,
                  (isStart || isEnd) && styles.selectedDayText,
                  isDisabled && styles.disabledDayText,
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  selectedRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  selectedBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  selectedLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedValue: {
    color: '#14213D',
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DEE4EF',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  navButtonText: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
  },
  monthTitle: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDay: {
    color: '#667085',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayText: {
    color: '#14213D',
    fontWeight: '700',
  },
  rangeDay: {
    backgroundColor: '#FFE9EA',
  },
  rangeDayText: {
    color: '#B4232A',
  },
  bookedDay: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
  },
  bookedDayText: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  selectedDay: {
    backgroundColor: '#FF5A5F',
    borderRadius: 10,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  disabledDay: {
    opacity: 0.35,
  },
  disabledDayText: {
    color: '#94A3B8',
  },
});
