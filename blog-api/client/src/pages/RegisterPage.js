import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register } from '../services/api';

function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors([]);
    setLoading(true);
    try {
      const res = await register(form);
      loginUser(res.data.data.user, res.data.data.token);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Registration failed');
      setErrors(data?.errors || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h1>Register</h1>
      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        {errors.map((e, i) => (
          <div key={i} className="error-msg">{e.field}: {e.message}</div>
        ))}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="john_doe"
              required
            />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#666' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
