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
  });

  const [error, setError] = useState('');

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

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        effort: formData.effort ? parseInt(formData.effort, 10) : null,
        importance: parseInt(formData.importance, 10),
        is_urgent: formData.is_urgent,
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
