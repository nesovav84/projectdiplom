import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils';

const navClassName = ({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`;

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <div className="brand brand--light">IT.TECH.SUPP</div>
          <p className="sidebar-subtitle">Панель администратора технической поддержки</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin" end className={navClassName}>Обзор</NavLink>
          <NavLink to="/admin/tickets" className={navClassName}>Заявки</NavLink>
          <NavLink to="/admin/users" className={navClassName}>Пользователи</NavLink>
          <NavLink to="/admin/reports" className={navClassName}>Отчёты</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip user-chip--dark">
            <div className="user-avatar">{getInitials(user?.full_name)}</div>
            <div>
              <div className="user-name user-name--light">{user?.full_name}</div>
              <div className="muted-text">{user?.position || 'Администратор'}</div>
            </div>
          </div>
          <button className="button button--secondary button--full" onClick={() => logout()}>Выйти</button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
