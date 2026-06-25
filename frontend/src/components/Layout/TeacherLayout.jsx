import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils';

const navClassName = ({ isActive }) => `nav-pill ${isActive ? 'nav-pill--active' : ''}`;

export default function TeacherLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="teacher-shell">
      <header className="teacher-header">
        <div>
          <div className="brand">IT.TECH.SUPP</div>
          <div className="muted-text">Техническая поддержка образовательного учреждения</div>
        </div>
        <div className="header-actions">
          <nav className="teacher-nav">
            <NavLink to="/teacher" end className={navClassName}>Дашборд</NavLink>
            <NavLink to="/teacher/tickets" className={navClassName}>Мои заявки</NavLink>
            <NavLink to="/teacher/tickets/create" className={navClassName}>Создать заявку</NavLink>
          </nav>
          <div className="user-chip">
            <div className="user-avatar user-avatar--light">{getInitials(user?.full_name)}</div>
            <div>
              <div className="user-name">{user?.full_name}</div>
              <div className="muted-text">{user?.position || 'Преподаватель'}</div>
            </div>
            <button className="button button--ghost" onClick={() => logout()}>Выход</button>
          </div>
        </div>
      </header>
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
