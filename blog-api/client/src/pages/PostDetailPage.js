import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPostById, deletePost, getCommentsByPost, createComment, deleteComment } from '../services/api';
import { useAuth } from '../context/AuthContext';

function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postRes, commentsRes] = await Promise.all([
          getPostById(id),
          getCommentsByPost(id),
        ]);
        setPost(postRes.data.data);
        setComments(commentsRes.data.data);
      } catch (err) {
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(id);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await createComment(id, { content: commentText });
      setComments([...comments, res.data.data]);
      setCommentText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  if (loading) return <div className="loading">Loading post...</div>;
  if (error && !post) return <div className="error-msg">{error}</div>;
  if (!post) return null;

  const isOwner = user && (user.id === post.author_id || user.role === 'admin');

  return (
    <div>
      <div className="card post-detail">
        <Link to="/" style={{ fontSize: '0.9rem' }}>&larr; Back to posts</Link>

        <h1 style={{ marginTop: '1rem' }}>{post.title}</h1>

        <div className="card-meta" style={{ marginTop: '0.5rem' }}>
          <span>By {post.author_username || post.author_name}</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span>{post.status}</span>
        </div>

        <div>
          {post.tags && post.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        {error && <div className="error-msg" style={{ marginTop: '1rem' }}>{error}</div>}

        <div className="content">{post.content}</div>

        {isOwner && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete Post</button>
          </div>
        )}
      </div>

      {/* ── Comments Section ── */}
      <div className="comments-section">
        <h3>Comments ({comments.length})</h3>

        {user && (
          <form onSubmit={handleAddComment} className="comment-form" style={{ marginBottom: '1rem' }}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
            />
            <button type="submit" className="btn btn-primary btn-sm">Add Comment</button>
          </form>
        )}

        {!user && (
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            <Link to="/login">Login</Link> to add a comment.
          </p>
        )}

        {comments.length === 0 ? (
          <p style={{ color: '#888' }}>No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-meta">
                <strong>{comment.author_username}</strong> &middot; {new Date(comment.created_at).toLocaleDateString()}
                {user && (user.id === comment.author_id || user.role === 'admin') && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    style={{ marginLeft: '0.5rem', color: '#e63946', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p>{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PostDetailPage;
