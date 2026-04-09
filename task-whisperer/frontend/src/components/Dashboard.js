import React, { useState, useEffect } from 'react';
import { getTasks, getOverdueCount } from '../api';
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
  const [sortBy, setSortBy] = useState('created'); // 'created', 'importance', 'deadline', 'effort', 'quadrant'
  const [sortAsc, setSortAsc] = useState(false); // true = ascending, false = descending
  const [overdueCount, setOverdueCount] = useState(0);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      setTasks(data);
      setError('');
      
      // Fetch overdue count
      try {
        const overdueData = await getOverdueCount();
        setOverdueCount(overdueData.total_overdue);
      } catch (err) {
        console.error('Failed to fetch overdue count:', err);
      }
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
    if (filter === 'overdue') return task.overdue && !task.completed;
    return true;
  });

  // Determine Eisenhower quadrant for a task
  const getQuadrantOrder = (task) => {
    if (task.category_override) {
      const order = { 'Q1-Do First': 0, 'Q2-Schedule': 1, 'Q3-Delegate': 2, 'Q4-Eliminate': 3 };
      return order[task.category_override] ?? 4;
    }
    if (task.is_urgent && task.importance >= 7) return 0;  // Q1
    if (!task.is_urgent && task.importance >= 7) return 1; // Q2
    if (task.is_urgent && task.importance < 7) return 2;   // Q3
    return 3; // Q4
  };

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'importance') return b.importance - a.importance;
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (sortBy === 'effort') {
      if (!a.effort && !b.effort) return 0;
      if (!a.effort) return 1;
      if (!b.effort) return -1;
      return sortAsc ? a.effort - b.effort : b.effort - a.effort;
    }
    if (sortBy === 'quadrant') {
      const qA = getQuadrantOrder(a);
      const qB = getQuadrantOrder(b);
      if (qA !== qB) return qA - qB;
      // Within same quadrant, sort by importance descending
      return b.importance - a.importance;
    }
    // Default: created_at
    return sortAsc
      ? new Date(a.created_at) - new Date(b.created_at)
      : new Date(b.created_at) - new Date(a.created_at);
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
        {overdueCount > 0 && (
          <div className="card" style={{ flex: 1, minWidth: '150px', marginBottom: 0, textAlign: 'center', border: '2px solid #EF4444' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#DC2626' }}>{overdueCount}</div>
            <div style={{ color: '#DC2626', fontSize: '0.9rem', fontWeight: 600 }}>Overdue ⚠️</div>
          </div>
        )}
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
            <option value="overdue">Overdue Only</option>
            <option value="completed">Completed Only</option>
            <option value="all">All Tasks</option>
          </select>
        </div>
        <div>
          <label style={{ marginRight: '0.5rem', color: '#64748B' }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              const newSort = e.target.value;
              setSortBy(newSort);
              // Set sensible default direction when switching sort type
              if (newSort === 'effort') setSortAsc(true);
              if (newSort === 'created') setSortAsc(false); // latest first by default
            }}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="created">Date Created</option>
            <option value="importance">Importance</option>
            <option value="deadline">Deadline</option>
            <option value="effort">Effort</option>
            <option value="quadrant">Eisenhower Quadrant</option>
          </select>
          {(sortBy === 'effort' || sortBy === 'created') && (
            <button
              onClick={() => setSortAsc(!sortAsc)}
              style={{
                marginLeft: '0.25rem',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#f8fafc',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
              title={sortAsc ? 'Currently: ascending. Click to reverse.' : 'Currently: descending. Click to reverse.'}
            >
              {sortBy === 'effort'
                ? sortAsc ? '↑ Min→Max' : '↓ Max→Min'
                : sortAsc ? '↑ Earliest→Latest' : '↓ Latest→Earliest'}
            </button>
          )}
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
