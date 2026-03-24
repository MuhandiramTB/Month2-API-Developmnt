import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, getPostsByUser } from '../services/api';
import { Link } from 'react-router-dom';

function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: '', bio: '' });
  const [posts, setPosts] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name || '', bio: user.bio || '' });
      getPostsByUser(user.id)
        .then((res) => setPosts(res.data.data))
        .catch(() => {});
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await updateProfile(form);
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  if (!user) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card" style={{ padding: '2rem' }}>
        <div className="profile-header">
          <div className="profile-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{user.full_name || user.username}</h2>
            <p style={{ color: '#666' }}>@{user.username} &middot; {user.role} &middot; {user.email}</p>
          </div>
        </div>

        {success && <div className="success-msg">{success}</div>}
        {error && <div className="error-msg">{error}</div>}

        {editing ? (
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                style={{ minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-outline" style={{ color: '#333', borderColor: '#ccc' }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div>
            <p style={{ marginBottom: '1rem', color: '#444' }}>{user.bio || 'No bio yet.'}</p>
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>
          </div>
        )}
      </div>

      <h2 style={{ margin: '2rem 0 1rem' }}>My Posts ({posts.length})</h2>
      {posts.length === 0 ? (
        <div className="card"><p>No posts yet. <Link to="/create">Create your first post!</Link></p></div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="card">
            <h2><Link to={`/posts/${post.id}`}>{post.title}</Link></h2>
            <div className="card-meta">
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span className="tag">{post.status}</span>
            </div>
            {post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
          </div>
        ))
      )}
    </div>
  );
}

export default ProfilePage;
