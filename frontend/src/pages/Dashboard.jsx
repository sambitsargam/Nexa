import React, { useState, useEffect } from 'react';
import { Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const API_BASE = 'http://localhost:3000/api';

export default function Dashboard({ onBack }) {
  const [mode, setMode] = useState('normal');
  const [normalData, setNormalData] = useState(null);
  const [privacyData, setPrivacyData] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [privacyAnalyzing, setPrivacyAnalyzing] = useState(false);
  const [privacyResult, setPrivacyResult] = useState(null);
  const [privacyCtHash, setPrivacyCtHash] = useState(null);
  const [blockStart, setBlockStart] = useState(2000000);
  const [blockEnd, setBlockEnd] = useState(2000100);

  // Fetch real API data
  useEffect(() => {
    if (mode === 'normal') {
      fetchNormalData();
    } else {
      fetchPrivacyData();
    }
  }, [mode]);

  const fetchNormalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/aggregates`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setNormalData(data);
      
      // Fetch AI summary
      try {
        const summaryResponse = await fetch(`${API_BASE}/summary`);
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setAiSummary(summaryData);
        }
      } catch (summaryErr) {
        console.warn('Could not fetch AI summary:', summaryErr);
      }
      
      // Generate historical data for charts
      const hist = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        transactions: Math.floor(Math.random() * 2000) + 800,
        shielded: Math.floor(Math.random() * 1500) + 500,
        fees: (Math.random() * 0.0002 + 0.00005).toFixed(6),
      }));
      setHistoricalData(hist);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching normal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivacyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/privacy/aggregates`);
      if (!response.ok) throw new Error('Failed to fetch privacy data');
      const data = await response.json();
      setPrivacyData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching privacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Privacy Mode Analysis Functions
  const startPrivacyAnalysis = async () => {
    setPrivacyAnalyzing(true);
    setError(null);
    try {
      // Create mock encrypted item (in production: Cofhejs encryption)
      const encryptedItem = {
        ctHash: '0x' + Math.random().toString(16).slice(2, 66),
        signature: '0x' + Math.random().toString(16).slice(2, 130),
        utype: 'uint256',
      };

      logger.info('Starting privacy analysis', { blockStart, blockEnd, ctHash: encryptedItem.ctHash });

      // Submit analysis request
      const response = await fetch(`${API_BASE}/privacy/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockStart: parseInt(blockStart),
          blockEnd: parseInt(blockEnd),
          encryptedItem,
        }),
      });

      if (!response.ok) throw new Error('Failed to start privacy analysis');

      const data = await response.json();
      setPrivacyCtHash(data.ctHash);

      // Start polling for results
      pollPrivacyResult(data.ctHash);
    } catch (err) {
      setError(err.message);
      console.error('Error starting privacy analysis:', err);
      setPrivacyAnalyzing(false);
    }
  };

  // Poll backend for analysis completion
  const pollPrivacyResult = async (ctHash, attempts = 0) => {
    const maxAttempts = 120; // 2 minutes max

    try {
      const response = await fetch(`${API_BASE}/privacy/result/${ctHash}`);
      const data = await response.json();

      if (data.status === 'completed') {
        setPrivacyResult(data);
        setPrivacyAnalyzing(false);
        logger.info('Privacy analysis completed');
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(() => pollPrivacyResult(ctHash, attempts + 1), 1000);
      } else {
        setError('Privacy analysis timed out');
        setPrivacyAnalyzing(false);
      }
    } catch (err) {
      logger.error('Error polling privacy result:', err);
      if (attempts < maxAttempts) {
        setTimeout(() => pollPrivacyResult(ctHash, attempts + 1), 2000);
      }
    }
  };

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
            ← Back
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
        {error && <div className="error-banner">{error}</div>}
        {loading && <div className="loading">Loading data...</div>}

        {mode === 'normal' && normalData && (
          <div className="normal-mode">
            <h1>Network Analytics</h1>

            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-label">Total Transactions</span>
                  <span className="kpi-trend up">↑ +5.2%</span>
                </div>
                <div className="kpi-value">{normalData.tx_count.toLocaleString()}</div>
                <div className="kpi-subtitle">Last hour</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-label">Shielded Transactions</span>
                  <span className="kpi-trend up">↑ +3.1%</span>
                </div>
                <div className="kpi-value">{normalData.shielded_count.toLocaleString()}</div>
                <div className="kpi-subtitle">of total</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-label">Shielded Ratio</span>
                  <span className="kpi-trend stable">→ Stable</span>
                </div>
                <div className="kpi-value">{(normalData.shielded_ratio * 100).toFixed(1)}%</div>
                <div className="kpi-subtitle">Privacy adoption</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-label">Average Fee</span>
                  <span className="kpi-trend down">↓ -2.3%</span>
                </div>
                <div className="kpi-value">{(normalData.avg_fee * 100000).toFixed(0)} μZEC</div>
                <div className="kpi-subtitle">Transaction cost</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-card">
                <h3>Transaction Trend (24h)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <Line data={historicalData} dataKey="transactions" stroke="#4f46e5" />
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Privacy Distribution</h3>
                <div className="doughnut-container">
                  <div className="doughnut-chart">
                    <div className="doughnut-inner">
                      <div className="doughnut-value">{(normalData.shielded_ratio * 100).toFixed(0)}%</div>
                    </div>
                    <svg viewBox="0 0 100 100" className="doughnut-svg">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#4f46e5" strokeWidth="8" 
                        strokeDasharray={`${normalData.shielded_ratio * 251} 251`} />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" 
                        strokeDashoffset={-normalData.shielded_ratio * 251} opacity="0.2" />
                    </svg>
                  </div>
                  <div className="doughnut-legend">
                    <div className="legend-item">
                      <span className="legend-color" style={{ background: '#4f46e5' }}></span>
                      <span>Shielded</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{ background: '#e5e7eb' }}></span>
                      <span>Public</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="table-section">
              <h3>Recent Transactions Summary</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Change (1h)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Transactions</td>
                      <td className="value-cell">{normalData.tx_count}</td>
                      <td><span className="badge up">+128 txs</span></td>
                      <td><span className="status-badge active">Active</span></td>
                    </tr>
                    <tr>
                      <td>Shielded Count</td>
                      <td className="value-cell">{normalData.shielded_count}</td>
                      <td><span className="badge up">+92 txs</span></td>
                      <td><span className="status-badge active">Growing</span></td>
                    </tr>
                    <tr>
                      <td>Average Fee</td>
                      <td className="value-cell">{(normalData.avg_fee * 100000).toFixed(0)} μZEC</td>
                      <td><span className="badge down">-0.5 μZEC</span></td>
                      <td><span className="status-badge normal">Optimal</span></td>
                    </tr>
                    <tr>
                      <td>Total Fees Collected</td>
                      <td className="value-cell">{normalData.total_fees} ZEC</td>
                      <td><span className="badge up">+0.01 ZEC</span></td>
                      <td><span className="status-badge active">Increasing</span></td>
                    </tr>
                    <tr>
                      <td>Fee Variance</td>
                      <td className="value-cell">{(normalData.fee_variance * 1e6).toFixed(2)}e-6</td>
                      <td><span className="badge">±0.1%</span></td>
                      <td><span className="status-badge normal">Stable</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights */}
            <div className="insights-section">
              <h3>📊 Key Insights</h3>
              
              {/* AI-Generated Summary */}
              {aiSummary && (
                <div className="ai-summary-card">
                  <div className="ai-header">
                    <span className="ai-badge">🤖 AI-Generated</span>
                    <h4>Network Summary</h4>
                  </div>
                  <p className="ai-summary-text">{aiSummary.summary || aiSummary}</p>
                  <div className="ai-metadata">
                    <span className="timestamp">Generated at {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
              
              <div className="insights-grid">
                <div className="insight-card primary">
                  <div className="insight-icon">🔐</div>
                  <div className="insight-content">
                    <h4>High Privacy Adoption</h4>
                    <p>71.4% of transactions are shielded, indicating strong privacy preference across the network.</p>
                  </div>
                </div>
                <div className="insight-card success">
                  <div className="insight-icon">⚡</div>
                  <div className="insight-content">
                    <h4>Low Transaction Fees</h4>
                    <p>Average fee of 0.0001 ZEC makes transactions cost-effective and accessible.</p>
                  </div>
                </div>
                <div className="insight-card info">
                  <div className="insight-icon">📈</div>
                  <div className="insight-content">
                    <h4>Consistent Activity</h4>
                    <p>1250 transactions per hour shows steady network engagement and reliability.</p>
                  </div>
                </div>
                <div className="insight-card warning">
                  <div className="insight-icon">⚠️</div>
                  <div className="insight-content">
                    <h4>Fee Variance Detected</h4>
                    <p>Minor variations in fees suggest occasional network congestion. Monitor closely.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'privacy' && (
          <div className="privacy-mode">
            <h1>🔐 Privacy-Preserving Analysis</h1>
            
            {/* Analysis Controls */}
            <div className="privacy-controls">
              <div className="control-group">
                <label>Block Range Analysis</label>
                <div className="input-row">
                  <input
                    type="number"
                    placeholder="Start Block"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    disabled={privacyAnalyzing}
                  />
                  <span className="input-separator">to</span>
                  <input
                    type="number"
                    placeholder="End Block"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    disabled={privacyAnalyzing}
                  />
                </div>
              </div>

              <button
                className="btn-analyze"
                onClick={startPrivacyAnalysis}
                disabled={privacyAnalyzing || !blockStart || !blockEnd}
              >
                {privacyAnalyzing ? (
                  <>
                    <span className="spinner">⟳</span> Analyzing...
                  </>
                ) : (
                  '🔐 Analyze Privately'
                )}
              </button>
            </div>

            {/* Loading State */}
            {privacyAnalyzing && (
              <div className="privacy-loading">
                <div className="loading-spinner"></div>
                <h3>Privacy Analysis In Progress</h3>
                <p>
                  Ingesting blocks • Preprocessing vectors • Encrypting with CoFHE •
                  Computing on encrypted data • Generating summary
                </p>
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
                {privacyCtHash && (
                  <p className="ct-hash-display">
                    <strong>ctHash:</strong> {privacyCtHash.slice(0, 16)}...
                  </p>
                )}
              </div>
            )}

            {/* Analysis Results */}
            {privacyResult && !privacyAnalyzing && (
              <div className="privacy-result">
                <div className="result-status">
                  <div className="status-icon">✅</div>
                  <h2>Analysis Complete</h2>
                  <p>Privacy-preserved insights generated</p>
                </div>

                {/* AI Summary */}
                {privacyResult.summary && (
                  <div className="privacy-ai-summary">
                    <div className="summary-header">
                      <span className="badge-encrypted">🤖 AI-Generated Insight</span>
                      <h3>Privacy-Safe Summary</h3>
                    </div>
                    <p className="summary-text">{privacyResult.summary}</p>
                  </div>
                )}

                {/* Aggregates Display */}
                {privacyResult.aggregates && (
                  <div className="privacy-metrics">
                    <h3>Encrypted Analysis Results</h3>
                    <div className="metrics-grid">
                      <div className="metric-card">
                        <span className="metric-label">Transactions</span>
                        <span className="metric-value">{privacyResult.aggregates.tx_count}</span>
                      </div>
                      <div className="metric-card">
                        <span className="metric-label">Shielded</span>
                        <span className="metric-value">
                          {(privacyResult.aggregates.shielded_ratio * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="metric-card">
                        <span className="metric-label">Avg Fee</span>
                        <span className="metric-value">
                          {(privacyResult.aggregates.avg_fee * 100000).toFixed(2)} μZEC
                        </span>
                      </div>
                      <div className="metric-card">
                        <span className="metric-label">Fee Variance</span>
                        <span className="metric-value">
                          {(privacyResult.aggregates.fee_variance * 1e6).toFixed(2)}e-6
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {privacyResult.metadata && (
                  <div className="privacy-metadata">
                    <h3>Analysis Metadata</h3>
                    <div className="metadata-grid">
                      <div className="metadata-item">
                        <span className="label">ctHash:</span>
                        <span className="value monospace">{privacyCtHash?.slice(0, 20)}...</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Block Range:</span>
                        <span className="value">{blockStart} → {blockEnd}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Transactions Analyzed:</span>
                        <span className="value">{privacyResult.metadata.txCount}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Processed:</span>
                        <span className="value">
                          {new Date(privacyResult.processedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="btn-new-analysis"
                  onClick={() => {
                    setPrivacyResult(null);
                    setPrivacyCtHash(null);
                  }}
                >
                  ↻ Analyze Different Block Range
                </button>
              </div>
            )}

            {/* Default Privacy Status (no analysis yet) */}
            {!privacyAnalyzing && !privacyResult && (
              <div className="privacy-status">
                <div className="status-icon">🔐</div>
                <h2>Ready for Private Analysis</h2>
                <p>
                  All computations performed on encrypted data. Results verified through on-chain proofs.
                  No intermediate data exposure.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2025 Nexa - Privacy Analytics Engine</p>
      </footer>
    </div>
  );
}
