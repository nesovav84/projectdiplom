import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../constants';
import { formatDate } from '../../utils';

const initialFilters = {
  status: '',
  priority: '',
  category: '',
  search: ''
};

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);

  const loadTickets = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
      const { data } = await api.get('/tickets', { params });
      setTickets(data.tickets || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(initialFilters);
  }, []);

  const handleChange = (field, value) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
  };

  return (
    <div className="page-stack">
      <section className="page-header-card">
        <div>
          <span className="eyebrow">Мои заявки</span>
          <h1>История обращений и текущие статусы</h1>
        </div>
        <Link className="button button--primary" to="/teacher/tickets/create">Новая заявка</Link>
      </section>

      <section className="card">
        <div className="filters-grid filters-grid--four">
          <input className="input" value={filters.search} onChange={(event) => handleChange('search', event.target.value)} placeholder="Поиск по заявкам" />
          <select className="input" value={filters.status} onChange={(event) => handleChange('status', event.target.value)}>
            <option value="">Все статусы</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="input" value={filters.priority} onChange={(event) => handleChange('priority', event.target.value)}>
            <option value="">Все приоритеты</option>
            {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="input" value={filters.category} onChange={(event) => handleChange('category', event.target.value)}>
            <option value="">Все категории</option>
            {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="button-row">
          <button className="button button--primary" onClick={() => loadTickets(filters)}>Применить</button>
          <button className="button button--ghost" onClick={() => { setFilters(initialFilters); loadTickets(initialFilters); }}>Сбросить</button>
        </div>

        {loading ? (
          <div className="empty-state">Загрузка...</div>
        ) : tickets.length ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Заголовок</th>
                  <th>Категория</th>
                  <th>Приоритет</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td><Link className="table-link" to={`/teacher/tickets/${ticket.id}`}>{ticket.title}</Link></td>
                    <td><StatusBadge type="category" value={ticket.category} /></td>
                    <td><StatusBadge type="priority" value={ticket.priority} /></td>
                    <td><StatusBadge value={ticket.status} /></td>
                    <td>{formatDate(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Заявки не найдены.</div>
        )}
      </section>
    </div>
  );
}
