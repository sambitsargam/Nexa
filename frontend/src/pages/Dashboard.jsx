import React, { useState, useEffect } from 'react';
import './Dashboard.css';

export default function Dashboard({ onBack }) {
  const [mode, setMode] = useState('normal');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const mockNormal = {
    tx_count: 1250,
    shielded_count: 892,
    shielded_ratio: 0.714,
    avg_fee: 0.0001,
    summary: 'Zcash network shows 71% shielded transactions with stable fees.',
  };

  const mockPrivacy = {
    job_id: 'job_a1b2c3d4e5f6',
    status: 'completed',
    summary: 'Privacy-preserved analysis complete. Network health confirmed.',
  };

  useEffect(() => {
    if (mode === 'normal') {
      setData(mockNormal);
    } else {
      setData(mockPrivacy);
    }
  }, [mode]);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          <div className="header-brand">
            <span className="brand-icon">📊</span>
            <span className="brand-text">Nexa Dashboard</span>
          </div>
          <button className="btn-back" onClick={onBack}>
            ← Back to Landing
          </button>
        </div>
      </header>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          className={`toggle-btn ${mode === 'normal' ? 'active' : ''}`}
          onClick={() => setMode('normal')}
        >
          📊 Normal Mode
        </button>
        <button
          className={`toggle-btn ${mode === 'privacy' ? 'active' : ''}`}
          onClick={() => setMode('privacy')}
        >
          🔐 Privacy Mode
        </button>
      </div>

      {/* Content */}
      <main className="dashboard-content">
        {mode === 'normal' ? (
          <div className="normal-mode">
            <h1>Network Analytics</h1>
            {data && (
              <>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-label">Total Transactions</div>
                    <div className="metric-value">{data.tx_count}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Shielded Transactions</div>
                    <div className="metric-value">{data.shielded_count}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Shielded Ratio</div>
                    <div className="metric-value">{(data.shielded_ratio * 100).toFixed(1)}%</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Average Fee</div>
                    <div className="metric-value">{(data.avg_fee * 100000).toFixed(0)} μZEC</div>
                  </div>
                </div>
                <div className="summary-card">
                  <h2>Summary</h2>
                  <p>{data.summary}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="privacy-mode">
            <h1>Privacy-Preserving Analytics</h1>
            {data && (
              <>
                <div className="privacy-status">
                  <div className="status-icon">🔐</div>
                  <h2>End-to-End Encrypted</h2>
                  <p>All data encrypted with homomorphic encryption. Zero data exposure.</p>
                </div>
                <div className="privacy-details">
                  <div className="detail-item">
                    <span className="detail-label">Job ID:</span>
                    <span className="detail-value">{data.job_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value status-badge">{data.status}</span>
                  </div>
                </div>
                <div className="summary-card privacy">
                  <h2>Encrypted Summary</h2>
                  <p>{data.summary}</p>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2025 Nexa Privacy Analytics</p>
      </footer>
    </div>
  );
}
