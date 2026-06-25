import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../constants';
import { downloadBlob, formatDate } from '../../utils';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const updateForm = useForm();
  const commentForm = useForm({ defaultValues: { content: '', is_internal: false } });
  const uploadForm = useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketResponse, usersResponse] = await Promise.all([
        api.get(`/tickets/${id}`),
        api.get('/users')
      ]);
      setTicket(ticketResponse.data.ticket);
      setUsers(usersResponse.data.users || []);
      updateForm.reset({
        title: ticketResponse.data.ticket.title,
        category: ticketResponse.data.ticket.category,
        priority: ticketResponse.data.ticket.priority,
        status: ticketResponse.data.ticket.status,
        description: ticketResponse.data.ticket.description,
        assigned_to: ticketResponse.data.ticket.assigned_to || ''
      });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Не удалось загрузить заявку.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const saveTicket = async (values) => {
    try {
      setMessage('');
      setErrorMessage('');
      await api.put(`/tickets/${id}`, values);
      setMessage('Изменения сохранены.');
      await loadData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Не удалось обновить заявку.');
    }
  };

  const addComment = async (values) => {
    await api.post(`/tickets/${id}/comments`, values);
    commentForm.reset({ content: '', is_internal: false });
    await loadData();
  };

  const uploadAttachment = async ({ file }) => {
    const selectedFile = file?.[0];
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    await api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    uploadForm.reset();
    await loadData();
  };

  const deleteTicket = async () => {
    if (!window.confirm('Удалить заявку?')) {
      return;
    }
    await api.delete(`/tickets/${id}`);
    navigate('/admin/tickets');
  };

  const handleDownload = async (attachment) => {
    const response = await api.get(`/tickets/${id}/attachments/download/${attachment.id}`, {
      responseType: 'blob'
    });
    downloadBlob(response.data, attachment.original_name);
  };

  if (loading) {
    return <div className="screen-center">Загрузка...</div>;
  }

  if (!ticket) {
    return <div className="empty-state">{errorMessage || 'Заявка не найдена.'}</div>;
  }

  return (
    <div className="page-stack admin-page">
      <section className="page-header-card page-header-card--dark">
        <div>
          <span className="eyebrow">Заявка #{ticket.id}</span>
          <h1>{ticket.title}</h1>
          <p className="muted-text">Создана {formatDate(ticket.created_at)} • Автор: {ticket.created_by_name}</p>
        </div>
        <div className="button-row">
          <Link className="button button--ghost" to="/admin/tickets">Назад</Link>
          <button className="button button--danger" onClick={deleteTicket}>Удалить</button>
        </div>
      </section>

      <div className="content-grid content-grid--detail-admin">
        <section className="card card--dark">
          <div className="section-header"><h2>Параметры заявки</h2></div>
          <form className="form-grid form-grid--double" onSubmit={updateForm.handleSubmit(saveTicket)}>
            <label className="form-field form-field--full">
              <span>Заголовок</span>
              <input className="input input--dark" {...updateForm.register('title', { required: true })} />
            </label>
            <label className="form-field">
              <span>Категория</span>
              <select className="input input--dark" {...updateForm.register('category')}>
                {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Приоритет</span>
              <select className="input input--dark" {...updateForm.register('priority')}>
                {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Статус</span>
              <select className="input input--dark" {...updateForm.register('status')}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Исполнитель</span>
              <select className="input input--dark" {...updateForm.register('assigned_to')}>
                <option value="">Не назначен</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.full_name} ({user.role})</option>)}
              </select>
            </label>
            <label className="form-field form-field--full">
              <span>Описание</span>
              <textarea className="input input--textarea input--dark" {...updateForm.register('description')} />
            </label>
            {message && <div className="alert alert--success form-field--full">{message}</div>}
            {errorMessage && <div className="alert alert--error form-field--full">{errorMessage}</div>}
            <button className="button button--primary form-field--full" type="submit">Сохранить</button>
          </form>
          <div className="detail-grid detail-grid--compact">
            <div><strong>Статус сейчас</strong><StatusBadge value={ticket.status} /></div>
            <div><strong>Приоритет</strong><StatusBadge type="priority" value={ticket.priority} /></div>
          </div>
        </section>

        <section className="card card--dark">
          <div className="section-header"><h2>Вложения</h2></div>
          <form className="form-inline" onSubmit={uploadForm.handleSubmit(uploadAttachment)}>
            <input className="input input--file input--dark" type="file" {...uploadForm.register('file')} />
            <button className="button button--primary" type="submit">Загрузить</button>
          </form>
          <div className="list-stack">
            {ticket.attachments?.length ? ticket.attachments.map((attachment) => (
              <button key={attachment.id} className="list-item list-item--button list-item--dark" onClick={() => handleDownload(attachment)}>
                <span>{attachment.original_name}</span>
                <span className="muted-text">{attachment.full_name}</span>
              </button>
            )) : <div className="empty-state empty-state--small">Вложений нет.</div>}
          </div>
        </section>
      </div>

      <div className="content-grid content-grid--detail-admin">
        <section className="card card--dark">
          <div className="section-header"><h2>Комментарии</h2></div>
          <form className="form-grid" onSubmit={commentForm.handleSubmit(addComment)}>
            <textarea className="input input--textarea input--dark" {...commentForm.register('content', { required: true })} placeholder="Комментарий для сотрудника или преподавателя" />
            <label className="checkbox-row checkbox-row--dark">
              <input type="checkbox" {...commentForm.register('is_internal')} />
              <span>Внутренний комментарий</span>
            </label>
            <button className="button button--primary" type="submit">Добавить комментарий</button>
          </form>
          <div className="timeline">
            {ticket.comments?.length ? ticket.comments.map((comment) => (
              <article className="timeline-item timeline-item--dark" key={comment.id}>
                <div className="timeline-head">
                  <strong>{comment.full_name}</strong>
                  <span className="muted-text">{formatDate(comment.created_at)}</span>
                </div>
                {comment.is_internal ? <span className="badge badge--outline">Внутренний</span> : null}
                <p>{comment.content}</p>
              </article>
            )) : <div className="empty-state empty-state--small">Комментариев пока нет.</div>}
          </div>
        </section>

        <section className="card card--dark">
          <div className="section-header"><h2>История изменений</h2></div>
          <div className="timeline">
            {ticket.history?.length ? ticket.history.map((item) => (
              <article className="timeline-item timeline-item--dark" key={item.id}>
                <div className="timeline-head">
                  <strong>{item.full_name}</strong>
                  <span className="muted-text">{formatDate(item.created_at)}</span>
                </div>
                <p><strong>{item.action}</strong></p>
                <p className="muted-text">{item.old_value || '—'} → {item.new_value || '—'}</p>
              </article>
            )) : <div className="empty-state empty-state--small">История пока пуста.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
