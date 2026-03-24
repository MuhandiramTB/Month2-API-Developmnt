import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../services/api';

function CreatePostPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    tags: '',
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors([]);
    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await createPost(payload);
      navigate(`/posts/${res.data.data.id}`);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Failed to create post');
      setErrors(data?.errors || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Create New Post</h1>
      <div className="card" style={{ padding: '2rem' }}>
        {error && <div className="error-msg">{error}</div>}
        {errors.map((e, i) => (
          <div key={i} className="error-msg">{e.field}: {e.message}</div>
        ))}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter post title"
              required
            />
          </div>
          <div className="form-group">
            <label>Excerpt (optional)</label>
            <input
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Brief summary of the post"
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your post content here..."
              required
              style={{ minHeight: '250px' }}
            />
          </div>
          <div className="form-group">
            <label>Tags (comma separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="javascript, nodejs, tutorial"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreatePostPage;
