import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '../../constants';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      priority: 'medium',
      category: 'hardware'
    }
  });

  const onSubmit = async (values) => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      const { files, ...payload } = values;
      const { data } = await api.post('/tickets', payload);
      const ticketId = data.ticket.id;
      const selectedFiles = Array.from(files || []);

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/tickets/${ticketId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setSuccessMessage('Заявка успешно создана.');
      navigate(`/teacher/tickets/${ticketId}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Не удалось создать заявку.');
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header-card">
        <div>
          <span className="eyebrow">Создание заявки</span>
          <h1>Опишите проблему максимально подробно</h1>
        </div>
      </section>

      <section className="card">
        <form className="form-grid form-grid--double" onSubmit={handleSubmit(onSubmit)}>
          <label className="form-field form-field--full">
            <span>Заголовок</span>
            <input className="input" {...register('title', { required: 'Укажите заголовок заявки' })} placeholder="Не работает проектор в аудитории 305" />
            {errors.title && <small className="error-text">{errors.title.message}</small>}
          </label>

          <label className="form-field">
            <span>Категория</span>
            <select className="input" {...register('category', { required: 'Выберите категорию' })}>
              {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="form-field">
            <span>Приоритет</span>
            <select className="input" {...register('priority', { required: 'Выберите приоритет' })}>
              {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="form-field form-field--full">
            <span>Описание проблемы</span>
            <textarea className="input input--textarea" {...register('description', { required: 'Опишите проблему' })} placeholder="Укажите, что произошло, когда началась проблема и какие действия уже предпринимались." />
            {errors.description && <small className="error-text">{errors.description.message}</small>}
          </label>

          <label className="form-field form-field--full">
            <span>Вложения</span>
            <input className="input input--file" type="file" multiple {...register('files')} />
          </label>

          {successMessage && <div className="alert alert--success form-field--full">{successMessage}</div>}
          {errorMessage && <div className="alert alert--error form-field--full">{errorMessage}</div>}
          <button className="button button--primary form-field--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Создание...' : 'Отправить заявку'}
          </button>
        </form>
      </section>
    </div>
  );
}
