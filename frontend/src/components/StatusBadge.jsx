import { CATEGORY_LABELS, PRIORITY_LABELS, PRIORITY_STYLES, STATUS_LABELS, STATUS_STYLES } from '../constants';

export default function StatusBadge({ type = 'status', value }) {
  if (!value) {
    return <span className="badge badge--slate">—</span>;
  }

  if (type === 'priority') {
    return <span className={PRIORITY_STYLES[value] || 'badge badge--slate'}>{PRIORITY_LABELS[value] || value}</span>;
  }

  if (type === 'category') {
    return <span className="badge badge--outline">{CATEGORY_LABELS[value] || value}</span>;
  }

  return <span className={STATUS_STYLES[value] || 'badge badge--slate'}>{STATUS_LABELS[value] || value}</span>;
}
