import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomePath } from '../utils';

export default function Register() {
  const navigate = useNavigate();
  const { user, register: signUp } = useAuth();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    try {
      setErrorMessage('');
      setMessage('');
      const nextUser = await signUp(values);
      setMessage('Регистрация успешна.');
      navigate(getHomePath(nextUser.role));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Не удалось выполнить регистрацию.');
    }
  };

  return (
    <div className="auth-shell auth-shell--light">
      <div className="auth-card auth-card--wide">
        <div className="auth-brand">IT.TECH.SUPP</div>
        <h1>Регистрация преподавателя</h1>
        <p className="auth-subtitle">Создайте учётную запись для доступа к заявкам технической поддержки.</p>
        <form className="form-grid form-grid--double" onSubmit={handleSubmit(onSubmit)}>
          <label className="form-field">
            <span>ФИО</span>
            <input className="input" {...register('full_name', { required: 'Укажите ФИО' })} />
            {errors.full_name && <small className="error-text">{errors.full_name.message}</small>}
          </label>
          <label className="form-field">
            <span>Должность</span>
            <input className="input" {...register('position')} placeholder="Преподаватель информатики" />
          </label>
          <label className="form-field">
            <span>Логин</span>
            <input className="input" {...register('username', { required: 'Укажите логин' })} />
            {errors.username && <small className="error-text">{errors.username.message}</small>}
          </label>
          <label className="form-field">
            <span>Email</span>
            <input className="input" type="email" {...register('email', { required: 'Укажите email' })} />
            {errors.email && <small className="error-text">{errors.email.message}</small>}
          </label>
          <label className="form-field form-field--full">
            <span>Пароль</span>
            <input className="input" type="password" {...register('password', { required: 'Укажите пароль', minLength: { value: 6, message: 'Минимум 6 символов' } })} />
            {errors.password && <small className="error-text">{errors.password.message}</small>}
          </label>
          {message && <div className="alert alert--success form-field--full">{message}</div>}
          {errorMessage && <div className="alert alert--error form-field--full">{errorMessage}</div>}
          <button className="button button--primary button--full form-field--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : 'Зарегистрироваться'}
          </button>
        </form>
        <div className="auth-footer">
          <span>Уже есть учётная запись?</span>
          <Link to="/login">Войти</Link>
        </div>
        {user && <div className="muted-text">Вы уже авторизованы как {user.full_name}.</div>}
      </div>
    </div>
  );
}
