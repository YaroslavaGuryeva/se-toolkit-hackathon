import React, { useState, useEffect } from 'react';
import { getProfile, recomputeProfile } from '../api';

/**
 * InsightsPanel component showing learned user behavior analytics.
 */
function InsightsPanel() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recomputing, setRecomputing] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setError('');
    } catch (err) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const data = await recomputeProfile();
      setProfile(data);
    } catch (err) {
      setError('Failed to recompute profile');
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading insights...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!profile) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p>No profile data available</p>
      </div>
    );
  }

  // Helper to get color based on score
  const getScoreColor = (value, inverted = false) => {
    // For most metrics, higher is "more"
    if (inverted) {
      // Lower is better (e.g., procrastination)
      if (value <= 0.3) return '#10B981';
      if (value <= 0.6) return '#F59E0B';
      return '#EF4444';
    }
    if (value >= 0.7) return '#10B981';
    if (value >= 0.4) return '#F59E0B';
    return '#64748B';
  };

  // Helper to interpret scores
  const interpretProcrastination = (score) => {
    if (score <= 0.2) return 'Excellent! You rarely procrastinate.';
    if (score <= 0.5) return 'Good. You occasionally delay tasks.';
    if (score <= 0.7) return 'Moderate. Consider breaking tasks into smaller steps.';
    return 'High. Try the 2-minute rule: if it takes less than 2 minutes, do it now.';
  };

  const interpretShortTaskPreference = (score) => {
    if (score <= 0.3) return 'You handle long and short tasks equally.';
    if (score <= 0.6) return 'You have a slight preference for shorter tasks.';
    return 'You strongly prefer short, quick tasks. Try tackling one longer task daily.';
  };

  const interpretUrgencyBias = (score) => {
    if (score <= 0.3) return 'You tend to ignore urgency. Make sure deadlines are met.';
    if (score <= 0.6) return 'You balance urgency and importance well.';
    return 'You focus heavily on urgent tasks. Watch out for important-but-not-urgent tasks.';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#1e293b' }}>📊 Your Work Insights</h2>
        <button
          className="btn btn-secondary btn-small"
          onClick={handleRecompute}
          disabled={recomputing}
        >
          {recomputing ? '🔄 Recomputing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {/* Short Task Preference */}
        <div className="card">
          <h3 className="card-title">⚡ Short Task Preference</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: getScoreColor(profile.prefers_short_tasks),
              }}
            >
              {(profile.prefers_short_tasks * 100).toFixed(0)}%
            </div>
            <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', marginTop: '0.5rem' }}>
              <div
                style={{
                  width: `${profile.prefers_short_tasks * 100}%`,
                  height: '100%',
                  background: getScoreColor(profile.prefers_short_tasks),
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
            {interpretShortTaskPreference(profile.prefers_short_tasks)}
          </p>
        </div>

        {/* Average Completion Time */}
        <div className="card">
          <h3 className="card-title">⏱️ Avg Completion Time</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#4F46E5',
              }}
            >
              {profile.avg_completion_time.toFixed(1)} min
            </div>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
            {profile.avg_completion_time < 30
              ? 'You complete tasks quickly. Great efficiency!'
              : profile.avg_completion_time < 60
              ? 'Your task completion time is average. Keep it up!'
              : 'Tasks tend to take you longer. Consider time-boxing techniques.'}
          </p>
        </div>

        {/* Procrastination Score */}
        <div className="card">
          <h3 className="card-title">🐌 Procrastination Score</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: getScoreColor(profile.procrastination_score, true),
              }}
            >
              {(profile.procrastination_score * 100).toFixed(0)}%
            </div>
            <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', marginTop: '0.5rem' }}>
              <div
                style={{
                  width: `${profile.procrastination_score * 100}%`,
                  height: '100%',
                  background: getScoreColor(profile.procrastination_score, true),
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
            {interpretProcrastination(profile.procrastination_score)}
          </p>
        </div>

        {/* Urgency Bias */}
        <div className="card">
          <h3 className="card-title">🔥 Urgency Bias</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: getScoreColor(profile.urgency_bias),
              }}
            >
              {(profile.urgency_bias * 100).toFixed(0)}%
            </div>
            <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', marginTop: '0.5rem' }}>
              <div
                style={{
                  width: `${profile.urgency_bias * 100}%`,
                  height: '100%',
                  background: getScoreColor(profile.urgency_bias),
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
            {interpretUrgencyBias(profile.urgency_bias)}
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="card" style={{ marginTop: '1.5rem', background: '#F0FDF4', borderLeft: '4px solid #10B981' }}>
        <h3 className="card-title">📈 Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>Total Tasks Completed</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
              {profile.total_tasks_completed}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>Profile Last Updated</div>
            <div style={{ fontSize: '0.95rem', color: '#1e293b' }}>
              {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>
        <p style={{ marginTop: '1rem', color: '#065F46', fontSize: '0.9rem' }}>
          💡 <strong>Tip:</strong> Your profile is automatically updated each time you complete a task.
          The AI uses these insights to personalize task recommendations.
        </p>
      </div>

      {/* Eisenhower Matrix Guide */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">📐 Eisenhower Matrix Guide</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div className="card quadrant-q1" style={{ marginBottom: 0 }}>
            <h4 style={{ color: '#DC2626' }}>Q1: Do First 🔥</h4>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
              <strong>Urgent + Important</strong><br />
              Crises, deadlines, critical problems. Handle these immediately.
            </p>
          </div>
          <div className="card quadrant-q2" style={{ marginBottom: 0 }}>
            <h4 style={{ color: '#3B82F6' }}>Q2: Schedule 📅</h4>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
              <strong>Not Urgent + Important</strong><br />
              Planning, development, learning. Schedule dedicated time for these.
            </p>
          </div>
          <div className="card quadrant-q3" style={{ marginBottom: 0 }}>
            <h4 style={{ color: '#D97706' }}>Q3: Delegate 📋</h4>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
              <strong>Urgent + Not Important</strong><br />
              Interruptions, some meetings. Delegate or minimize time spent.
            </p>
          </div>
          <div className="card quadrant-q4" style={{ marginBottom: 0 }}>
            <h4 style={{ color: '#6B7280' }}>Q4: Eliminate 🗑️</h4>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
              <strong>Not Urgent + Not Important</strong><br />
              Time wasters, busy work. Consider eliminating these entirely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsightsPanel;
