import React, { useState } from 'react';
import { completeTask, deleteTask } from '../api';

/**
 * TaskItem component for displaying and managing a single task.
 */
function TaskItem({ task, onRefresh }) {
  const [showComplete, setShowComplete] = useState(false);
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Determine Eisenhower quadrant
  const getQuadrant = () => {
    if (task.is_urgent && task.importance >= 7) return { key: 'Q1', label: 'Do First', class: 'quadrant-q1' };
    if (!task.is_urgent && task.importance >= 7) return { key: 'Q2', label: 'Schedule', class: 'quadrant-q2' };
    if (task.is_urgent && task.importance < 7) return { key: 'Q3', label: 'Delegate', class: 'quadrant-q3' };
    return { key: 'Q4', label: 'Eliminate', class: 'quadrant-q4' };
  };

  const quadrant = getQuadrant();

  // Format deadline
  const formatDeadline = (deadline) => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return 'Overdue';
    if (diffHours < 1) return 'Less than 1 hour';
    if (diffHours < 24) return `${diffHours}h remaining`;
    if (diffDays < 7) return `${diffDays}d remaining`;
    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(task.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const handleComplete = async () => {
    if (!duration || parseFloat(duration) <= 0) {
      setError('Please enter a valid duration');
      return;
    }
    try {
      await completeTask(task.id, parseFloat(duration));
      setSuccess('Task marked as complete!');
      setShowComplete(false);
      setDuration('');
      if (onRefresh) setTimeout(() => onRefresh(), 500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete task');
    }
  };

  if (task.completed) {
    return (
      <div className="card" style={{ opacity: 0.7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ textDecoration: 'line-through', color: '#64748B' }}>{task.title}</h4>
            <span className="badge badge-completed">Completed</span>
          </div>
          <button className="btn btn-danger btn-small" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${quadrant.class}`}>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ marginBottom: '0.5rem' }}>{task.title}</h4>
          {task.description && (
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              {task.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span className={`badge ${task.is_urgent ? 'badge-urgent' : 'badge-normal'}`}>
              {task.is_urgent ? '🔥 Urgent' : 'Normal'}
            </span>
            <span className="badge badge-important">
              ⭐ Importance: {task.importance}/10
            </span>
            <span className="badge badge-normal">
              📐 {quadrant.key}: {quadrant.label}
            </span>
            {task.effort && (
              <span className="badge badge-normal">
                ⏱️ ~{task.effort} min
              </span>
            )}
            <span className="badge badge-normal">
              📅 {formatDeadline(task.deadline)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <button
          className="btn btn-success btn-small"
          onClick={() => setShowComplete(!showComplete)}
        >
          ✅ Complete
        </button>
        {onRefresh && (
          <button className="btn btn-secondary btn-small" onClick={onRefresh}>
            🔄 Refresh
          </button>
        )}
        <button className="btn btn-danger btn-small" onClick={handleDelete}>
          🗑️ Delete
        </button>
      </div>

      {showComplete && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
          <label className="form-label" htmlFor={`duration-${task.id}`}>
            How long did it take? (minutes)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              id={`duration-${task.id}`}
              className="form-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 25"
              min="1"
              style={{ flex: 1 }}
            />
            <button className="btn btn-success btn-small" onClick={handleComplete}>
              Confirm
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => {
                setShowComplete(false);
                setDuration('');
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskItem;
