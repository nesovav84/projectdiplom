import { Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AdminLayout from './components/Layout/AdminLayout';
import TeacherLayout from './components/Layout/TeacherLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/teacher/Dashboard';
import CreateTicket from './pages/teacher/CreateTicket';
import MyTickets from './pages/teacher/MyTickets';
import TeacherTicketDetail from './pages/teacher/TicketDetail';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTickets from './pages/admin/Tickets';
import AdminTicketDetail from './pages/admin/TicketDetail';
import Users from './pages/admin/Users';
import Reports from './pages/admin/Reports';
import { useAuth } from './context/AuthContext';
import { getHomePath } from './utils';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? getHomePath(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/teacher"
        element={(
          <PrivateRoute roles={['teacher']}>
            <TeacherLayout />
          </PrivateRoute>
        )}
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="tickets" element={<MyTickets />} />
        <Route path="tickets/create" element={<CreateTicket />} />
        <Route path="tickets/:id" element={<TeacherTicketDetail />} />
      </Route>

      <Route
        path="/admin"
        element={(
          <PrivateRoute roles={['admin']}>
            <AdminLayout />
          </PrivateRoute>
        )}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="tickets/:id" element={<AdminTicketDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
