import React, { useState } from 'react';
import { getRecommendation } from '../api';

/**
 * RecommendationPanel component for getting AI-powered task suggestions.
 */
function RecommendationPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState(null);

  const handleGetRecommendation = async () => {
    setLoading(true);
    setError('');
    setRecommendation(null);
    try {
      const data = await getRecommendation();
      setRecommendation(data);
    } catch (err) {
      setError('Failed to get recommendation. Check if the backend and Qwen API are configured.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get quadrant color class
  const getQuadrantClass = (quadrant) => {
    if (!quadrant) return '';
    if (quadrant.startsWith('Q1')) return 'quadrant-q1';
    if (quadrant.startsWith('Q2')) return 'quadrant-q2';
    if (quadrant.startsWith('Q3')) return 'quadrant-q3';
    return 'quadrant-q4';
  };

  return (
    <div>
      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>🧠 What should I do next?</h2>
        <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
          Let AI analyze your tasks using the Eisenhower Matrix and your work patterns
        </p>
        <button
          className="btn btn-primary"
          onClick={handleGetRecommendation}
          disabled={loading}
          style={{ fontSize: '1.1rem', padding: '0.8rem 2rem' }}
        >
          {loading ? '🔄 Analyzing...' : '✨ Get Recommendation'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤔</div>
          <p style={{ color: '#64748B' }}>
            Analyzing your tasks, deadlines, and work patterns...
          </p>
        </div>
      )}

      {recommendation && (
        <div>
          {/* Top recommendation */}
          {recommendation.recommended_task ? (
            <div className={`card quadrant-q1`}>
              <h3 className="card-title">🎯 Top Recommendation</h3>
              <div
                style={{
                  background: '#F8FAFC',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}
              >
                <h2 style={{ color: '#4F46E5', marginBottom: '0.5rem' }}>
                  {recommendation.recommended_task.title}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <span className="badge badge-urgent">
                    Rank #{recommendation.recommended_task.rank}
                  </span>
                  <span className="badge badge-important">
                    Score: {recommendation.recommended_task.score.toFixed(1)}/100
                  </span>
                  <span className={`badge badge-normal ${getQuadrantClass(recommendation.recommended_task.eisenhower_quadrant)}`}>
                    {recommendation.recommended_task.eisenhower_quadrant}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</p>
              <p style={{ color: '#64748B' }}>
                {recommendation.explanation || 'No active tasks to recommend. Add some tasks first!'}
              </p>
            </div>
          )}

          {/* Full ranking */}
          {recommendation.ranking && recommendation.ranking.length > 0 && (
            <div className="card">
              <h3 className="card-title">📊 Full Ranking</h3>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748B' }}>
                        Rank
                      </th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748B' }}>
                        Task
                      </th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748B' }}>
                        Score
                      </th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748B' }}>
                        Quadrant
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendation.ranking.map((item) => (
                      <tr
                        key={item.task_id}
                        style={{ borderBottom: '1px solid #F1F5F9' }}
                      >
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                          #{item.rank}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{item.title}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                background: '#E2E8F0',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${item.score}%`,
                                  height: '100%',
                                  background:
                                    item.score >= 70
                                      ? '#EF4444'
                                      : item.score >= 40
                                      ? '#F59E0B'
                                      : '#10B981',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                              {item.score.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge badge-normal ${getQuadrantClass(item.eisenhower_quadrant)}`}>
                            {item.eisenhower_quadrant}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Explanation */}
          {recommendation.explanation && (
            <div className="card" style={{ background: '#FEFCE8', borderLeft: '4px solid #F59E0B' }}>
              <h3 className="card-title">💡 AI Explanation</h3>
              <p style={{ color: '#78350F', lineHeight: 1.7 }}>{recommendation.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecommendationPanel;
