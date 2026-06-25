import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../api/axios';
import { CATEGORY_LABELS, categoryChartColors } from '../../constants';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const [statsResponse, monthlyResponse, categoriesResponse] = await Promise.all([
        api.get('/reports/stats'),
        api.get('/reports/monthly'),
        api.get('/reports/by-category')
      ]);

      setStats(statsResponse.data.stats);
      setMonthly(monthlyResponse.data.months || []);
      setCategories((categoriesResponse.data.categories || []).map((item) => ({
        ...item,
        name: CATEGORY_LABELS[item.category] || item.category
      })));
    };

    loadData();
  }, []);

  const cards = [
    { label: 'Всего заявок', value: stats?.total_tickets ?? 0 },
    { label: 'Новые', value: stats?.new_tickets ?? 0 },
    { label: 'В работе', value: stats?.in_progress_tickets ?? 0 },
    { label: 'Закрытые', value: stats?.closed_tickets ?? 0 },
    { label: 'Срочные', value: stats?.urgent_tickets ?? 0 },
    { label: 'Среднее время (ч)', value: stats?.avg_processing_time_hours ?? 0 }
  ];

  return (
    <div className="page-stack admin-page">
      <section className="page-header-card page-header-card--dark">
        <div>
          <span className="eyebrow">Панель администратора</span>
          <h1>Контроль работы технической поддержки</h1>
          <p className="muted-text">Отслеживайте поток обращений, приоритеты и эффективность обработки заявок.</p>
        </div>
      </section>

      <section className="stats-grid stats-grid--dark">
        {cards.map((card) => (
          <article className="stat-card stat-card--dark" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="chart-grid">
        <article className="card card--dark">
          <div className="section-header"><h2>Заявки по месяцам</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#CBD5E1" />
                <YAxis stroke="#CBD5E1" />
                <Tooltip />
                <Bar dataKey="total" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card card--dark">
          <div className="section-header"><h2>Категории</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={categories} dataKey="total" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
                  {categories.map((entry, index) => <Cell key={entry.category} fill={categoryChartColors[index % categoryChartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-list">
            {categories.map((item, index) => (
              <div className="legend-item" key={item.category}>
                <span className="legend-color" style={{ backgroundColor: categoryChartColors[index % categoryChartColors.length] }} />
                <span>{item.name}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
