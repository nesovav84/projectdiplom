import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { downloadBlob, formatDate } from '../../utils';

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const commentForm = useForm();
  const uploadForm = useForm();

  const loadTicket = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setTicket(data.ticket);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Не удалось загрузить заявку.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  const addComment = async (values) => {
    await api.post(`/tickets/${id}/comments`, values);
    commentForm.reset();
    await loadTicket();
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
    await loadTicket();
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
    <div className="page-stack">
      <section className="page-header-card">
        <div>
          <span className="eyebrow">Заявка #{ticket.id}</span>
          <h1>{ticket.title}</h1>
          <p className="muted-text">Создана {formatDate(ticket.created_at)} • Последнее обновление {formatDate(ticket.updated_at)}</p>
        </div>
        <Link className="button button--ghost" to="/teacher/tickets">Назад к списку</Link>
      </section>

      <div className="content-grid content-grid--detail">
        <section className="card">
          <div className="detail-grid">
            <div><strong>Статус</strong><StatusBadge value={ticket.status} /></div>
            <div><strong>Приоритет</strong><StatusBadge type="priority" value={ticket.priority} /></div>
            <div><strong>Категория</strong><StatusBadge type="category" value={ticket.category} /></div>
            <div><strong>Исполнитель</strong><span>{ticket.assigned_to_name || 'Не назначен'}</span></div>
          </div>
          <div className="detail-block">
            <h3>Описание</h3>
            <p>{ticket.description}</p>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <h2>Вложения</h2>
          </div>
          <form className="form-inline" onSubmit={uploadForm.handleSubmit(uploadAttachment)}>
            <input className="input input--file" type="file" {...uploadForm.register('file')} />
            <button className="button button--primary" type="submit">Загрузить</button>
          </form>
          <div className="list-stack">
            {ticket.attachments?.length ? ticket.attachments.map((attachment) => (
              <button key={attachment.id} className="list-item list-item--button" onClick={() => handleDownload(attachment)}>
                <span>{attachment.original_name}</span>
                <span className="muted-text">{Math.round((attachment.file_size || 0) / 1024)} КБ</span>
              </button>
            )) : <div className="empty-state empty-state--small">Файлы не добавлены.</div>}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="section-header">
          <h2>Комментарии</h2>
        </div>
        <form className="form-grid" onSubmit={commentForm.handleSubmit(addComment)}>
          <textarea className="input input--textarea" {...commentForm.register('content', { required: true })} placeholder="Добавьте комментарий или уточнение." />
          <button className="button button--primary" type="submit">Отправить комментарий</button>
        </form>
        <div className="timeline">
          {ticket.comments?.length ? ticket.comments.map((comment) => (
            <article className="timeline-item" key={comment.id}>
              <div className="timeline-head">
                <strong>{comment.full_name}</strong>
                <span className="muted-text">{formatDate(comment.created_at)}</span>
              </div>
              <p>{comment.content}</p>
            </article>
          )) : <div className="empty-state empty-state--small">Комментариев пока нет.</div>}
        </div>
      </section>
    </div>
  );
}
