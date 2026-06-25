export const STATUS_LABELS = {
  new: 'Новая',
  accepted: 'Принята',
  in_progress: 'В работе',
  waiting: 'Ожидание пользователя',
  resolved: 'Решена',
  closed: 'Закрыта',
  cancelled: 'Отменена'
};

export const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный'
};

export const CATEGORY_LABELS = {
  hardware: 'Оборудование',
  software: 'Программное обеспечение',
  network: 'Сеть',
  access: 'Доступ',
  other: 'Другое'
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export const STATUS_STYLES = {
  new: 'badge badge--blue',
  accepted: 'badge badge--purple',
  in_progress: 'badge badge--yellow',
  waiting: 'badge badge--orange',
  resolved: 'badge badge--green',
  closed: 'badge badge--slate',
  cancelled: 'badge badge--red'
};

export const PRIORITY_STYLES = {
  low: 'badge badge--slate',
  medium: 'badge badge--blue',
  high: 'badge badge--orange',
  urgent: 'badge badge--red'
};

export const categoryChartColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
