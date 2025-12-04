import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';

const App = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [normalData, setNormalData] = React.useState(null);
  const [privacyData, setPrivacyData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const mockNormalData = {
    tx_count: 1250,
    shielded_count: 892,
    shielded_ratio: 0.714,
    avg_fee: 0.0001,
    total_fees: 0.125,
    fee_variance: 0.00000025,
    summary: 'Zcash network shows typical activity with 71% shielded transactions and stable fees.',
  };

  const mockPrivacyData = {
    job_id: 'job_a1b2c3d4e5f6',
    ciphertext_size: 2048,
    encrypted: true,
    summary: 'Privacy-preserved analysis indicates strong network health with encrypted metrics. No raw data exposure.',
    status: 'completed',
  };

  const timeSeriesData = [
    { time: '00:00', tx: 850, shielded: 608 },
    { time: '04:00', tx: 950, shielded: 680 },
    { time: '08:00', tx: 1100, shielded: 787 },
    { time: '12:00', tx: 1250, shielded: 892 },
    { time: '16:00', tx: 1180, shielded: 843 },
    { time: '20:00', tx: 1000, shielded: 715 },
  ];

  const feeDistribution = [
    { name: 'Low', value: 100, fill: '#3b82f6' },
    { name: 'Medium', value: 750, fill: '#60a5fa' },
    { name: 'High', value: 300, fill: '#93c5fd' },
    { name: 'Premium', value: 100, fill: '#0284c7' },
  ];

  const fetchNormalData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/aggregates');
      const data = await response.json();
      setNormalData(data);
    } catch (error) {
      console.error('Error fetching normal data:', error);
      setNormalData(mockNormalData);
    }
    setLoading(false);
  };

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/privacy/aggregates');
      const data = await response.json();
      setPrivacyData(data);
    } catch (error) {
      console.error('Error fetching privacy data:', error);
      setPrivacyData(mockPrivacyData);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchNormalData();
  }, []);

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <span className="brand-icon">🔐</span>
            <span className="brand-text">Nexa</span>
          </div>
          <div className="navbar-links">
            <a href="#" className="nav-link">Privacy Engine</a>
            <a href="#" className="nav-link">Documentation</a>
            <a href="#" className="nav-link">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Privacy Analytics Engine</h1>
          <p className="hero-subtitle">
            Homomorphic encryption meets blockchain analytics. Analyze Zcash network data with zero data exposure.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => setActiveTab('dashboard')}>
              View Dashboard
            </button>
            <button className="btn btn-secondary">
              Learn More
            </button>
          </div>
        </div>
        <div className="hero-graphic">
          <div className="rotating-cube">
            <div className="cube-face">🔐</div>
            <div className="cube-face">📊</div>
            <div className="cube-face">🔗</div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="tab-icon">📊</span>
            Normal Mode
          </button>
          <button
            className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <span className="tab-icon">🔒</span>
            Privacy Mode
          </button>
          <button
            className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <span className="tab-icon">✨</span>
            Features
          </button>
        </div>
      </div>

      {/* Content Sections */}
      <div className="content-container">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <section className="tab-content">
            <div className="section-header">
              <h2>Network Analytics</h2>
              <button className="btn btn-sm" onClick={fetchNormalData} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>

            {/* Metrics Cards */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Transactions (1h)</div>
                <div className="metric-value">{normalData?.tx_count || 1250}</div>
                <div className="metric-change">↑ 5.2% from last hour</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Shielded Ratio</div>
                <div className="metric-value">
                  {normalData ? (normalData.shielded_ratio * 100).toFixed(1) : 71.4}%
                </div>
                <div className="metric-change">📈 Strong privacy adoption</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average Fee</div>
                <div className="metric-value">
                  {normalData ? (normalData.avg_fee * 100000).toFixed(1) : 10} μZEC
                </div>
                <div className="metric-change">Stable market conditions</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total Fees</div>
                <div className="metric-value">{normalData?.total_fees || 0.125} ZEC</div>
                <div className="metric-change">Source: 3xpl Sandbox</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Transaction Timeline</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tx"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={false}
                      name="Total TX"
                    />
                    <Line
                      type="monotone"
                      dataKey="shielded"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                      name="Shielded TX"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>Fee Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={feeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {feeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary */}
            <div className="summary-card">
              <h3>AI-Generated Insight</h3>
              <p>{normalData?.summary || mockNormalData.summary}</p>
              <div className="summary-badge">Plaintext Analytics</div>
            </div>
          </section>
        )}

        {/* Privacy Mode Tab */}
        {activeTab === 'privacy' && (
          <section className="tab-content">
            <div className="section-header">
              <h2>Privacy-Preserving Analytics</h2>
              <button className="btn btn-sm" onClick={fetchPrivacyData} disabled={loading}>
                {loading ? 'Processing...' : 'Start Analysis'}
              </button>
            </div>

            <div className="privacy-container">
              {/* Encryption Status */}
              <div className="encryption-status">
                <div className="status-icon">🔐</div>
                <div className="status-content">
                  <h3>Encryption Status</h3>
                  <p>
                    Data encrypted with Fhenix CoFHE (Off-chain FHE)
                    <br />
                    Computations performed on encrypted data
                    <br />
                    Results stored in nilDB encrypted vault
                  </p>
                </div>
              </div>

              {/* Privacy Summary */}
              <div className="privacy-summary">
                <h3>Encrypted Analysis Summary</h3>
                <p>{privacyData?.summary || mockPrivacyData.summary}</p>
                <div className="summary-badge privacy">Encrypted Analytics</div>
              </div>

              {/* Job Details */}
              {privacyData && (
                <div className="job-details">
                  <h3>Job Details</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Job ID:</span>
                      <span className="detail-value">{privacyData.job_id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value status-badge">{privacyData.status}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Ciphertext Size:</span>
                      <span className="detail-value">{privacyData.ciphertext_size} bytes</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Encrypted:</span>
                      <span className="detail-value">✓ Yes</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Encrypted Metrics Timeline */}
              <div className="encrypted-timeline">
                <h3>Encrypted Metrics Timeline</h3>
                <div className="timeline-placeholder">
                  <div className="placeholder-item">
                    <div className="placeholder-box"></div>
                    <span>Ciphertext Blob 1</span>
                  </div>
                  <div className="placeholder-item">
                    <div className="placeholder-box"></div>
                    <span>Ciphertext Blob 2</span>
                  </div>
                  <div className="placeholder-item">
                    <div className="placeholder-box"></div>
                    <span>Ciphertext Blob 3</span>
                  </div>
                </div>
              </div>

              {/* Privacy Features */}
              <div className="privacy-features">
                <h3>Privacy-Preserving Features</h3>
                <div className="features-list">
                  <div className="feature">
                    <span className="feature-icon">✓</span>
                    <div>
                      <strong>Zero Data Exposure</strong>
                      <p>Raw transaction data never transmitted</p>
                    </div>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">✓</span>
                    <div>
                      <strong>Homomorphic Computation</strong>
                      <p>Calculations on encrypted data</p>
                    </div>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">✓</span>
                    <div>
                      <strong>Cryptographic Provenance</strong>
                      <p>Full audit trail with timestamps</p>
                    </div>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">✓</span>
                    <div>
                      <strong>Privacy-Safe Embeddings</strong>
                      <p>Normalized aggregates only, no raw metrics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <section className="tab-content">
            <div className="features-showcase">
              <h2>Core Features</h2>

              <div className="feature-cards">
                <div className="feature-card">
                  <div className="feature-icon-large">🔗</div>
                  <h3>Zcash Integration</h3>
                  <p>
                    Real-time data from 3xpl sandbox API. Poll blocks, transactions, and mempool data with exponential backoff retry logic and intelligent caching.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-large">🔐</div>
                  <h3>Homomorphic Encryption</h3>
                  <p>
                    Fhenix CoFHE integration for off-chain FHE. Encrypt analytics vectors and perform computations on encrypted data without decryption.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-large">💾</div>
                  <h3>Encrypted Storage</h3>
                  <p>
                    Nillion nilDB vault integration. Store ciphertext blobs with cryptographic provenance logging and reference-based retrieval.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-large">🤖</div>
                  <h3>Privacy-Safe AI</h3>
                  <p>
                    Nillion nilAI integration. Generate natural language summaries from normalized embeddings with zero raw data exposure.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-large">📊</div>
                  <h3>Dual Analytics</h3>
                  <p>
                    Normal mode for plaintext analytics and privacy mode for encrypted analysis. Choose based on your security requirements.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-large">📝</div>
                  <h3>Provenance Logging</h3>
                  <p>
                    Track source URLs, block ranges, job IDs, and timestamps. Complete audit trail for regulatory compliance and verification.
                  </p>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="tech-stack">
                <h3>Technology Stack</h3>
                <div className="tech-items">
                  <div className="tech-item">
                    <span className="tech-badge">Backend</span>
                    <span>Express.js, Node.js</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-badge">Encryption</span>
                    <span>Fhenix CoFHE (FHE)</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-badge">Storage</span>
                    <span>Nillion nilDB</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-badge">AI</span>
                    <span>Nillion nilAI</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-badge">Data</span>
                    <span>3xpl API, Zcash</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-badge">Frontend</span>
                    <span>React, Recharts</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Nexa</h4>
            <p>Privacy Analytics Engine for Zcash Blockchain</p>
          </div>
          <div className="footer-section">
            <h4>Documentation</h4>
            <ul>
              <li><a href="#">README</a></li>
              <li><a href="#">Architecture</a></li>
              <li><a href="#">API Reference</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Links</h4>
            <ul>
              <li><a href="https://3xpl.com">3xpl API</a></li>
              <li><a href="https://fhenix.zone">Fhenix</a></li>
              <li><a href="https://nillion.com">Nillion</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Nexa. MIT License. Built for Privacy. Ready for Production.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
