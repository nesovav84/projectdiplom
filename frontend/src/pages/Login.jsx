import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomePath } from '../utils';

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      username: '',
      password: ''
    }
  });

  if (user) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  const onSubmit = async (values) => {
    try {
      setErrorMessage('');
      const nextUser = await login(values);
      navigate(getHomePath(nextUser.role));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Не удалось выполнить вход.');
    }
  };

  return (
    <div className="auth-shell auth-shell--light">
      <div className="auth-card">
        <div className="auth-brand">IT.TECH.SUPP</div>
        <h1>Вход в систему</h1>
        <p className="auth-subtitle">Управляйте заявками технической поддержки в одном месте.</p>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <label className="form-field">
            <span>Логин</span>
            <input className="input" {...register('username', { required: 'Укажите логин' })} placeholder="admin" />
            {errors.username && <small className="error-text">{errors.username.message}</small>}
          </label>
          <label className="form-field">
            <span>Пароль</span>
            <input className="input" type="password" {...register('password', { required: 'Укажите пароль' })} placeholder="••••••••" />
            {errors.password && <small className="error-text">{errors.password.message}</small>}
          </label>
          {errorMessage && <div className="alert alert--error">{errorMessage}</div>}
          <button className="button button--primary button--full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <div className="auth-footer">
          <span>Нет учётной записи?</span>
          <Link to="/register">Зарегистрироваться</Link>
        </div>
        <div className="demo-credentials">
          <strong>Тестовые данные:</strong>
          <div>Администратор: admin / admin123</div>
          <div>Преподаватель: teacher / admin123</div>
        </div>
      </div>
    </div>
  );
}
