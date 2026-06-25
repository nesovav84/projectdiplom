import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../constants';
import { formatDate } from '../../utils';

const baseFilters = {
  status: '',
  priority: '',
  category: '',
  dateFrom: '',
  dateTo: '',
  search: '',
  sortBy: 'created_at',
  sortOrder: 'desc'
};

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState(baseFilters);
  const [loading, setLoading] = useState(true);

  const loadTickets = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value !== ''));
      const { data } = await api.get('/tickets', { params });
      setTickets(data.tickets || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(baseFilters);
  }, []);

  return (
    <div className="page-stack admin-page">
      <section className="page-header-card page-header-card--dark">
        <div>
          <span className="eyebrow">Управление заявками</span>
          <h1>Фильтрация, приоритизация и контроль исполнения</h1>
        </div>
      </section>

      <section className="card card--dark">
        <div className="filters-grid filters-grid--six">
          <input className="input input--dark" placeholder="Поиск" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <select className="input input--dark" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Все статусы</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="input input--dark" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
            <option value="">Все приоритеты</option>
            {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="input input--dark" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
            <option value="">Все категории</option>
            {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input className="input input--dark" type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />
          <input className="input input--dark" type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} />
        </div>
        <div className="filters-grid filters-grid--three filters-grid--compact">
          <select className="input input--dark" value={filters.sortBy} onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}>
            <option value="created_at">По дате создания</option>
            <option value="updated_at">По дате обновления</option>
            <option value="priority">По приоритету</option>
            <option value="status">По статусу</option>
          </select>
          <select className="input input--dark" value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value })}>
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>
          <div className="button-row button-row--right">
            <button className="button button--primary" onClick={() => loadTickets(filters)}>Применить</button>
            <button className="button button--ghost" onClick={() => { setFilters(baseFilters); loadTickets(baseFilters); }}>Сбросить</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Загрузка...</div>
        ) : (
          <div className="table-wrapper">
            <table className="table table--dark">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Заголовок</th>
                  <th>Автор</th>
                  <th>Исполнитель</th>
                  <th>Категория</th>
                  <th>Приоритет</th>
                  <th>Статус</th>
                  <th>Создана</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td><Link className="table-link" to={`/admin/tickets/${ticket.id}`}>{ticket.title}</Link></td>
                    <td>{ticket.created_by_name}</td>
                    <td>{ticket.assigned_to_name || '—'}</td>
                    <td><StatusBadge type="category" value={ticket.category} /></td>
                    <td><StatusBadge type="priority" value={ticket.priority} /></td>
                    <td><StatusBadge value={ticket.status} /></td>
                    <td>{formatDate(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
