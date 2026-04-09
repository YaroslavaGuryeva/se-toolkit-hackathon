import React from 'react';

/**
 * TaskDetailModal component - displays full task details in a modal overlay.
 */
function TaskDetailModal({ task, onClose }) {
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

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

  const getQuadrantInfo = () => {
    if (task.category_override) {
      const parts = task.category_override.split('-');
      return { key: parts[0], label: parts.slice(1).join('-'), note: '(custom override)' };
    }
    if (task.is_urgent && task.importance >= 7) return { key: 'Q1', label: 'Do First', note: '(auto-classified)' };
    if (!task.is_urgent && task.importance >= 7) return { key: 'Q2', label: 'Schedule', note: '(auto-classified)' };
    if (task.is_urgent && task.importance < 7) return { key: 'Q3', label: 'Delegate', note: '(auto-classified)' };
    return { key: 'Q4', label: 'Eliminate', note: '(auto-classified)' };
  };

  const quadrant = getQuadrantInfo();

  const quadrantColors = {
    'Q1': { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626' },
    'Q2': { bg: '#DBEAFE', border: '#3B82F6', text: '#2563EB' },
    'Q3': { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706' },
    'Q4': { bg: '#F3F4F6', border: '#6B7280', text: '#4B5563' },
  };
  const qColor = quadrantColors[quadrant.key] || quadrantColors['Q4'];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          borderLeft: `4px solid ${qColor.border}`,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            color: '#64748B',
          }}
        >
          ✕
        </button>

        {/* Title */}
        <h3 style={{ margin: 0, marginBottom: '1.5rem', paddingRight: '2rem', color: '#1E293B' }}>
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </label>
            <p style={{ margin: '0.5rem 0 0', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {task.description}
            </p>
          </div>
        )}

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Importance */}
          <div style={{ padding: '0.75rem', background: '#FEF3C7', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400E', marginBottom: '0.25rem' }}>
              ⭐ Importance
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#78350F' }}>
              {task.importance}/10
            </div>
          </div>

          {/* Urgency */}
          <div style={{ padding: '0.75rem', background: task.is_urgent ? '#FEE2E2' : '#F1F5F9', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: task.is_urgent ? '#991B1B' : '#64748B', marginBottom: '0.25rem' }}>
              🔥 Urgency
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: task.is_urgent ? '#7F1D1D' : '#475569' }}>
              {task.is_urgent ? 'Urgent' : 'Not Urgent'}
            </div>
          </div>

          {/* Quadrant */}
          <div style={{ padding: '0.75rem', background: qColor.bg, borderRadius: '8px', border: `1px solid ${qColor.border}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: qColor.text, marginBottom: '0.25rem' }}>
              📐 Eisenhower Quadrant
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: qColor.text }}>
              {quadrant.key}: {quadrant.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: qColor.text, opacity: 0.7, marginTop: '0.25rem' }}>
              {quadrant.note}
            </div>
          </div>

          {/* Effort */}
          <div style={{ padding: '0.75rem', background: '#E0E7FF', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3730A3', marginBottom: '0.25rem' }}>
              ⏱️ Estimated Effort
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#312E81' }}>
              {task.effort ? `~${task.effort} min` : 'Not set'}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ padding: '0.75rem', background: task.overdue ? '#FEE2E2' : '#F0FDF4', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: task.overdue ? '#991B1B' : '#166534', marginBottom: '0.25rem' }}>
              📅 Deadline
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: task.overdue ? '#7F1D1D' : '#14532D' }}>
              {formatDeadline(task.deadline)}
            </div>
            {task.deadline && (
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>
                {formatDateTime(task.deadline)}
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ padding: '0.75rem', background: task.completed ? '#D1FAE5' : task.overdue ? '#FEE2E2' : '#E0E7FF', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: task.completed ? '#065F46' : task.overdue ? '#991B1B' : '#3730A3', marginBottom: '0.25rem' }}>
              📋 Status
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: task.completed ? '#064E3B' : task.overdue ? '#7F1D1D' : '#312E81' }}>
              {task.completed ? '✅ Completed' : task.overdue ? '⏰ Overdue' : '🔄 Active'}
            </div>
          </div>
        </div>

        {/* Created/Updated timestamps */}
        <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px', fontSize: '0.8rem', color: '#64748B' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <strong>Created:</strong> {formatDateTime(task.created_at)}
          </div>
          <div>
            <strong>Updated:</strong> {formatDateTime(task.updated_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
