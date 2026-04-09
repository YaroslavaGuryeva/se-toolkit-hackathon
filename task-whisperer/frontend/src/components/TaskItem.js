import React, { useState } from 'react';
import { completeTask, deleteTask, updateTaskCategory } from '../api';
import TaskDetailModal from './TaskDetailModal';

/**
 * TaskItem component for displaying and managing a single task.
 */
function TaskItem({ task }) {
  const [showComplete, setShowComplete] = useState(false);
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Determine Eisenhower quadrant (respects category_override)
  const getQuadrant = () => {
    if (task.category_override) {
      const parts = task.category_override.split('-');
      return { key: parts[0], label: parts.slice(1).join('-'), class: `quadrant-${parts[0].toLowerCase()}` };
    }
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

  // Get deadline status class
  const getDeadlineStatus = () => {
    if (task.completed) return 'completed';
    if (task.overdue) return 'overdue';
    if (!task.deadline) return 'no-deadline';
    const date = new Date(task.deadline);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMs < 0) return 'overdue';
    if (diffHours < 24) return 'urgent';
    return 'normal';
  };

  const deadlineStatus = getDeadlineStatus();

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(task.id);
      window.location.reload();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete task';
      setError(errorMsg);
      console.error('Delete task error:', err);
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
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete task');
    }
  };

  const handleCategoryChange = async (e) => {
    const newCategory = e.target.value || null;
    try {
      await updateTaskCategory(task.id, newCategory);
      setSuccess('Category updated!');
      setShowCategoryEditor(false);
      setTimeout(() => window.location.reload(), 300);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update category');
    }
  };

  if (task.completed) {
    return (
      <>
        <div className="card" style={{ opacity: 0.7 }}>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h4
                style={{ textDecoration: 'line-through', color: '#64748B', marginBottom: '0.5rem', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
                title="Click to view details"
              >
                {task.title}
              </h4>
              {task.description && (
                <p
                  style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.5rem', textDecoration: 'line-through', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
                  title="Click to view details"
                >
                  {task.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <span className="badge badge-completed">✅ Completed</span>
                {task.overdue && (
                  <span className="badge badge-overdue">⏰ Was Overdue</span>
                )}
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
            <button className="btn btn-danger btn-small" onClick={handleDelete} style={{ marginLeft: '0.5rem' }}>
              🗑️ Delete
            </button>
          </div>
        </div>
        {showDetails && <TaskDetailModal task={task} onClose={() => setShowDetails(false)} />}
      </>
    );
  }

  return (
    <>
      <div className={`card ${quadrant.class}`}>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h4
              style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
              title="Click to view details"
            >
              {task.title}
            </h4>
            {task.description && (
              <p
                style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '0.75rem', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
                title="Click to view details"
              >
                {task.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {task.overdue && (
                <span className="badge badge-overdue">⏰ Overdue</span>
              )}
              <span className={`badge ${task.is_urgent ? 'badge-urgent' : 'badge-normal'}`}>
                {task.is_urgent ? '🔥 Urgent' : 'Normal'}
              </span>
              <span className="badge badge-important">
                ⭐ Importance: {task.importance}/10
              </span>
              <span className="badge badge-normal" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setShowCategoryEditor(!showCategoryEditor); }} title="Click to change category">
                📐 {quadrant.key}: {quadrant.label} {task.category_override ? '(custom)' : '(auto)'} ✏️
              </span>
              {task.effort && (
                <span className="badge badge-normal">
                  ⏱️ ~{task.effort} min
                </span>
              )}
              <span className={`badge badge-deadline-${deadlineStatus}`}>
                📅 {formatDeadline(task.deadline)}
              </span>
            </div>
          </div>
        </div>

      {/* Category editor */}
      {showCategoryEditor && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
            Change Category:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className="form-input"
              value={task.category_override || ''}
              onChange={handleCategoryChange}
              style={{ flex: 1 }}
            >
              <option value="">Auto (use predicted category)</option>
              <option value="Q1-Do First">Q1 - Do First 🔥</option>
              <option value="Q2-Schedule">Q2 - Schedule 📅</option>
              <option value="Q3-Delegate">Q3 - Delegate 📋</option>
              <option value="Q4-Eliminate">Q4 - Eliminate 🗑️</option>
            </select>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setShowCategoryEditor(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <button
          className="btn btn-success btn-small"
          onClick={() => setShowComplete(!showComplete)}
        >
          ✅ Complete
        </button>
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
    {showDetails && <TaskDetailModal task={task} onClose={() => setShowDetails(false)} />}
  </>
  );
}

export default TaskItem;
