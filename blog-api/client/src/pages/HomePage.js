import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPosts } from '../services/api';

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 5,
    status: 'published',
    search: '',
    tag: '',
    sort: 'created_at',
    order: 'DESC',
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Remove empty filter values
      const params = {};
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== '') params[key] = val;
      });
      const res = await getPosts(params);
      setPosts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Blog Posts</h1>

      {/* ── Filters ── */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search posts..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <input
          type="text"
          placeholder="Filter by tag"
          value={filters.tag}
          onChange={(e) => handleFilterChange('tag', e.target.value)}
          style={{ width: '140px' }}
        />
        <select value={filters.sort} onChange={(e) => handleFilterChange('sort', e.target.value)}>
          <option value="created_at">Newest</option>
          <option value="updated_at">Recently Updated</option>
          <option value="title">Title A-Z</option>
        </select>
        <select value={filters.order} onChange={(e) => handleFilterChange('order', e.target.value)}>
          <option value="DESC">Descending</option>
          <option value="ASC">Ascending</option>
        </select>
      </div>

      {/* ── Posts List ── */}
      {loading ? (
        <div className="loading">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="card"><p>No posts found. Try different filters.</p></div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="card">
            <h2><Link to={`/posts/${post.id}`}>{post.title}</Link></h2>
            <div className="card-meta">
              <span>By {post.author_username || post.author_name}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span>{post.status}</span>
            </div>
            {post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
            <div>
              {post.tags && post.tags.map((tag) => (
                <span
                  key={tag}
                  className="tag"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleFilterChange('tag', tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm btn-primary"
            disabled={!pagination.hasPrev}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            className="btn btn-sm btn-primary"
            disabled={!pagination.hasNext}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default HomePage;
