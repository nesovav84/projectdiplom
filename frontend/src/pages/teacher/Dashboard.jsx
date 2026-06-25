import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../constants';
import { formatDate } from '../../utils';

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const { data } = await api.get('/tickets');
        setTickets(data.tickets || []);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, []);

  const stats = useMemo(() => ({
    total: tickets.length,
    active: tickets.filter((ticket) => ['new', 'accepted', 'in_progress', 'waiting'].includes(ticket.status)).length,
    resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    urgent: tickets.filter((ticket) => ticket.priority === 'urgent').length
  }), [tickets]);

  const latestTickets = tickets.slice(0, 5);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">Кабинет преподавателя</span>
          <h1>Быстрое создание и отслеживание заявок</h1>
          <p>Отправляйте обращения в техническую поддержку, следите за статусом и общайтесь с администраторами в одном интерфейсе.</p>
        </div>
        <Link className="button button--primary" to="/teacher/tickets/create">Новая заявка</Link>
      </section>

      <section className="stats-grid">
        <article className="stat-card stat-card--light"><span>Всего заявок</span><strong>{stats.total}</strong></article>
        <article className="stat-card stat-card--light"><span>Активные</span><strong>{stats.active}</strong></article>
        <article className="stat-card stat-card--light"><span>Решённые</span><strong>{stats.resolved}</strong></article>
        <article className="stat-card stat-card--light"><span>Срочные</span><strong>{stats.urgent}</strong></article>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Последние заявки</h2>
            <p className="muted-text">Актуальное состояние ваших обращений</p>
          </div>
          <Link to="/teacher/tickets" className="button button--ghost">Все заявки</Link>
        </div>
        {loading ? (
          <div className="empty-state">Загрузка...</div>
        ) : latestTickets.length ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Заголовок</th>
                  <th>Статус</th>
                  <th>Приоритет</th>
                  <th>Создана</th>
                </tr>
              </thead>
              <tbody>
                {latestTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td>
                      <Link className="table-link" to={`/teacher/tickets/${ticket.id}`}>{ticket.title}</Link>
                    </td>
                    <td><StatusBadge value={ticket.status} /></td>
                    <td>{PRIORITY_LABELS[ticket.priority]}</td>
                    <td>{formatDate(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Пока нет заявок. Создайте первую заявку, чтобы начать работу.</div>
        )}
      </section>

      <section className="card card--accent">
        <h2>Подсказка</h2>
        <p className="muted-text">Используйте подробные описания и добавляйте вложения — это ускоряет обработку заявок. Статусы заявок: {Object.values(STATUS_LABELS).join(', ')}.</p>
      </section>
    </div>
  );
}
