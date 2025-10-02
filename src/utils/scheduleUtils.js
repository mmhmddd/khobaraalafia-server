import dayjs from 'dayjs';

export const parseTimeToMs = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60 + m) * 60 * 1000;
};

export const getWeekday = (dateStr) => {
  return dayjs(dateStr).format('dddd');
};

export const getClinicScheduleForDay = (schedules, day) => {
  return schedules.find(s => s.day === day || s.day === 'All');
};