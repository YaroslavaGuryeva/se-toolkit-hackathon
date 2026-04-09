import React, { useState, useEffect } from 'react';
import { getTasks } from '../api';
import TaskForm from './TaskForm';
import TaskItem from './TaskItem';

/**
 * Dashboard component showing all tasks and allowing task management.
 */
function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('active'); // 'all', 'active', 'completed'
  const [sortBy, setSortBy] = useState('created'); // 'created', 'importance', 'deadline'

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      setTasks(data);
      setError('');
    } catch (err) {
      setError('Failed to load tasks. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'importance') return b.importance - a.importance;
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    // Default: created_at descending
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '150px', marginBottom: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4F46E5' }}>{activeCount}</div>
          <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Active Tasks</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '150px', marginBottom: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10B981' }}>{completedCount}</div>
          <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Completed</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '150px', marginBottom: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7C3AED' }}>{tasks.length}</div>
          <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Total</div>
        </div>
      </div>

      {/* Add task button/form */}
      {!showAddForm ? (
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
          style={{ marginBottom: '1.5rem' }}
        >
          ➕ Add New Task
        </button>
      ) : (
        <TaskForm
          onSubmit={() => {
            setShowAddForm(false);
            fetchTasks();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Filters and sorting */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ marginRight: '0.5rem', color: '#64748B' }}>Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="active">Active Only</option>
            <option value="completed">Completed Only</option>
            <option value="all">All Tasks</option>
          </select>
        </div>
        <div>
          <label style={{ marginRight: '0.5rem', color: '#64748B' }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="created">Date Created</option>
            <option value="importance">Importance</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && <div className="error">{error}</div>}

      {/* Loading state */}
      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : sortedTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748B' }}>
          <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📝</p>
          <p>No tasks yet. Add your first task to get started!</p>
        </div>
      ) : (
        <div>
          {sortedTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
