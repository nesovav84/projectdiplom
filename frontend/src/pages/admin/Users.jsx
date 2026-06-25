import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils';

const emptyForm = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  role: 'teacher',
  position: ''
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  const loadUsers = async () => {
    const { data } = await api.get('/users');
    setUsers(data.users || []);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (editingUser) {
      reset({ ...editingUser, password: '' });
    } else {
      reset(emptyForm);
    }
  }, [editingUser, reset]);

  const onSubmit = async (values) => {
    try {
      setMessage('');
      setErrorMessage('');
      if (editingUser) {
        const payload = { ...values };
        delete payload.password;
        await api.put(`/users/${editingUser.id}`, payload);
        setMessage('Пользователь обновлён.');
      } else {
        await api.post('/users', values);
        setMessage('Пользователь создан.');
      }
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Не удалось сохранить пользователя.');
    }
  };

  const removeUser = async (userId) => {
    if (!window.confirm('Удалить пользователя?')) {
      return;
    }
    await api.delete(`/users/${userId}`);
    await loadUsers();
  };

  const resetPassword = async (userId) => {
    const nextPassword = window.prompt('Введите новый пароль (оставьте пустым для Temp1234!):', '');
    const { data } = await api.post(`/users/${userId}/reset-password`, { password: nextPassword || undefined });
    window.alert(`Новый пароль: ${data.password}`);
  };

  return (
    <div className="page-stack admin-page">
      <section className="page-header-card page-header-card--dark">
        <div>
          <span className="eyebrow">Пользователи</span>
          <h1>Управление учётными записями и доступами</h1>
        </div>
      </section>

      <section className="content-grid content-grid--users">
        <article className="card card--dark">
          <div className="section-header">
            <h2>{editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}</h2>
            {editingUser ? <button className="button button--ghost" onClick={() => setEditingUser(null)}>Отмена</button> : null}
          </div>
          <form className="form-grid form-grid--double" onSubmit={handleSubmit(onSubmit)}>
            <label className="form-field">
              <span>ФИО</span>
              <input className="input input--dark" {...register('full_name')} />
            </label>
            <label className="form-field">
              <span>Должность</span>
              <input className="input input--dark" {...register('position')} />
            </label>
            <label className="form-field">
              <span>Логин</span>
              <input className="input input--dark" {...register('username')} />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input className="input input--dark" type="email" {...register('email')} />
            </label>
            {!editingUser && (
              <label className="form-field">
                <span>Пароль</span>
                <input className="input input--dark" type="password" {...register('password')} />
              </label>
            )}
            <label className="form-field">
              <span>Роль</span>
              <select className="input input--dark" {...register('role')}>
                <option value="teacher">Преподаватель</option>
                <option value="admin">Администратор</option>
              </select>
            </label>
            {message && <div className="alert alert--success form-field--full">{message}</div>}
            {errorMessage && <div className="alert alert--error form-field--full">{errorMessage}</div>}
            <button className="button button--primary form-field--full" type="submit">{editingUser ? 'Сохранить' : 'Создать пользователя'}</button>
          </form>
        </article>

        <article className="card card--dark">
          <div className="section-header"><h2>Список пользователей</h2></div>
          <div className="table-wrapper">
            <table className="table table--dark">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Логин</th>
                  <th>Роль</th>
                  <th>Заявки</th>
                  <th>Создан</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>{user.full_name}</div>
                      <small className="muted-text">{user.email}</small>
                    </td>
                    <td>{user.username}</td>
                    <td>{user.role === 'admin' ? 'Администратор' : 'Преподаватель'}</td>
                    <td>{user.tickets_created}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="button-row button-row--compact">
                        <button className="button button--ghost" onClick={() => setEditingUser(user)}>Изменить</button>
                        <button className="button button--ghost" onClick={() => resetPassword(user.id)}>Сбросить пароль</button>
                        {user.id !== currentUser?.id ? <button className="button button--danger" onClick={() => removeUser(user.id)}>Удалить</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
