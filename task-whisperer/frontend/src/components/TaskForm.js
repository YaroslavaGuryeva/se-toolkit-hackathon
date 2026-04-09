import React, { useState } from 'react';
import { createTask, updateTask } from '../api';

/**
 * TaskForm component for creating and editing tasks.
 */
function TaskForm({ task = null, onSubmit, onCancel }) {
  const isEditing = task !== null;

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    deadline: task?.deadline
      ? new Date(task.deadline).toISOString().slice(0, 16)
      : '',
    effort: task?.effort || '',
    importance: task?.importance || 5,
    is_urgent: task?.is_urgent || false,
    category_override: task?.category_override || '',
  });

  const [error, setError] = useState('');

  // Compute predicted category based on current form values
  const getPredictedCategory = () => {
    const urgent = formData.is_urgent;
    const importance = parseInt(formData.importance, 10) || 5;
    if (urgent && importance >= 7) return { key: 'Q1', label: 'Do First' };
    if (!urgent && importance >= 7) return { key: 'Q2', label: 'Schedule' };
    if (urgent && importance < 7) return { key: 'Q3', label: 'Delegate' };
    return { key: 'Q4', label: 'Eliminate' };
  };

  const predictedCategory = getPredictedCategory();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    // Validate deadline is not in the past
    if (formData.deadline) {
      const selectedDeadline = new Date(formData.deadline);
      const now = new Date();
      if (selectedDeadline <= now) {
        setError('Deadline cannot be in the past. Please choose a future date and time.');
        return;
      }
    }

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        effort: formData.effort ? parseInt(formData.effort, 10) : null,
        importance: parseInt(formData.importance, 10),
        is_urgent: formData.is_urgent,
        category_override: formData.category_override || null,
      };

      if (isEditing) {
        await updateTask(task.id, taskData);
      } else {
        await createTask(taskData);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        deadline: '',
        effort: '',
        importance: 5,
        is_urgent: false,
      });

      if (onSubmit) onSubmit();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save task');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3 className="card-title">{isEditing ? '✏️ Edit Task' : '➕ Add New Task'}</h3>

      {error && <div className="error">{error}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="title">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          className="form-input"
          value={formData.title}
          onChange={handleChange}
          placeholder="What needs to be done?"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          className="form-input form-textarea"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add details about this task..."
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="deadline">
            Deadline
          </label>
          <input
            type="datetime-local"
            id="deadline"
            name="deadline"
            className="form-input"
            value={formData.deadline}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="effort">
            Estimated Effort (minutes)
          </label>
          <input
            type="number"
            id="effort"
            name="effort"
            className="form-input"
            value={formData.effort}
            onChange={handleChange}
            placeholder="e.g., 30"
            min="1"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="importance">
            Importance (1-10)
          </label>
          <input
            type="number"
            id="importance"
            name="importance"
            className="form-input"
            value={formData.importance}
            onChange={handleChange}
            min="1"
            max="10"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            name="is_urgent"
            checked={formData.is_urgent}
            onChange={handleChange}
          />
          <span>Mark as urgent</span>
        </label>
      </div>

      {/* Category approval section */}
      <div className="form-group" style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem' }}>
          📐 Task Category
          <span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#64748B', marginLeft: '0.5rem' }}>
            (Predicted: {predictedCategory.key} - {predictedCategory.label})
          </span>
        </label>
        <select
          name="category_override"
          className="form-input"
          value={formData.category_override}
          onChange={handleChange}
          style={{ width: '100%' }}
        >
          <option value="">Auto (use predicted category)</option>
          <option value="Q1-Do First">Q1 - Do First 🔥</option>
          <option value="Q2-Schedule">Q2 - Schedule 📅</option>
          <option value="Q3-Delegate">Q3 - Delegate 📋</option>
          <option value="Q4-Eliminate">Q4 - Eliminate 🗑️</option>
        </select>
        <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.35rem', marginBottom: 0 }}>
          {formData.category_override
            ? `Using your selection: ${formData.category_override}`
            : 'Will be auto-classified based on urgency and importance, or select a category above to override.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {isEditing ? 'Update Task' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}

export default TaskForm;
