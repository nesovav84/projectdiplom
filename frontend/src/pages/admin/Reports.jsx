import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../api/axios';
import { CATEGORY_LABELS, categoryChartColors } from '../../constants';
import { downloadBlob } from '../../utils';

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);

  const loadReports = async () => {
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

  useEffect(() => {
    loadReports();
  }, []);

  const exportFile = async (endpoint, fileName) => {
    const response = await api.get(endpoint, { responseType: 'blob' });
    downloadBlob(response.data, fileName);
  };

  return (
    <div className="page-stack admin-page">
      <section className="page-header-card page-header-card--dark">
        <div>
          <span className="eyebrow">Отчёты</span>
          <h1>Аналитика и экспорт данных</h1>
          <p className="muted-text">Выгружайте данные в PDF и Excel для управленческой отчётности.</p>
        </div>
        <div className="button-row">
          <button className="button button--primary" onClick={() => exportFile('/reports/export/pdf', 'it-tech-supp-report.pdf')}>PDF</button>
          <button className="button button--secondary" onClick={() => exportFile('/reports/export/excel', 'it-tech-supp-report.xlsx')}>Excel</button>
        </div>
      </section>

      <section className="stats-grid stats-grid--dark">
        <article className="stat-card stat-card--dark"><span>Всего</span><strong>{stats?.total_tickets ?? 0}</strong></article>
        <article className="stat-card stat-card--dark"><span>Новые</span><strong>{stats?.new_tickets ?? 0}</strong></article>
        <article className="stat-card stat-card--dark"><span>В работе</span><strong>{stats?.in_progress_tickets ?? 0}</strong></article>
        <article className="stat-card stat-card--dark"><span>Закрытые</span><strong>{stats?.closed_tickets ?? 0}</strong></article>
      </section>

      <section className="chart-grid">
        <article className="card card--dark">
          <div className="section-header"><h2>Помесячная динамика</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#CBD5E1" />
                <YAxis stroke="#CBD5E1" />
                <Tooltip />
                <Bar dataKey="total" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card card--dark">
          <div className="section-header"><h2>Распределение по категориям</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={categories} dataKey="total" nameKey="name" outerRadius={115}>
                  {categories.map((entry, index) => <Cell key={entry.category} fill={categoryChartColors[index % categoryChartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  );
}
