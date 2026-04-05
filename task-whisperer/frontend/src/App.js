import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import RecommendationPanel from './components/RecommendationPanel';
import InsightsPanel from './components/InsightsPanel';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="logo">🤫</span> Task Whisperer
          </h1>
          <p className="app-subtitle">AI-Powered Task Prioritization</p>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📋 Dashboard
          </button>
          <button
            className={`nav-tab ${activeTab === 'recommend' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommend')}
          >
            🧠 Recommendations
          </button>
          <button
            className={`nav-tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            📊 Insights
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'recommend' && <RecommendationPanel />}
        {activeTab === 'insights' && <InsightsPanel />}
      </main>

      <footer className="app-footer">
        <p>Task Whisperer &copy; 2025 — Powered by Qwen LLM & Eisenhower Matrix</p>
      </footer>
    </div>
  );
}

export default App;
