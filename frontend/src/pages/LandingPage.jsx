import React, { useState, useEffect } from 'react';
import './LandingPage.css';

export default function LandingPage({ onEnter }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-icon">🔐</span>
            <span className="logo-text">Nexa</span>
          </div>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#tech" className="nav-link">Tech</a>
            <button className="btn-launch" onClick={onEnter}>
              Launch
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">✨ Next-Gen Privacy Analytics</div>
          <h1>Analyze Without <span className="gradient-text">Exposing</span></h1>
          <p>Query encrypted blockchain data with homomorphic encryption. Get insights, keep privacy.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={onEnter}>
              Start Analyzing
              <span className="btn-arrow">→</span>
            </button>
            <button className="btn btn-secondary">
              View Docs
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">71%</span>
              <span className="stat-label">Privacy Safe</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">&lt;1ms</span>
              <span className="stat-label">Query Speed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">100%</span>
              <span className="stat-label">Encrypted</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="gradient-orb orb1"></div>
          <div className="gradient-orb orb2"></div>
          <div className="gradient-orb orb3"></div>
          <div className="hero-card">
            <div className="card-content">
              <div className="card-icon">📊</div>
              <div className="card-text">Real-time Analytics</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-header">
          <h2>Powerful Features</h2>
          <p>Everything you need for private data analysis</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box">
              <span>🔐</span>
            </div>
            <h3>End-to-End Encrypted</h3>
            <p>Homomorphic encryption keeps your data encrypted throughout the entire pipeline. No intermediate exposure.</p>
            <ul className="feature-list">
              <li>AES-256 encryption</li>
              <li>TFHE compatible</li>
              <li>Zero-knowledge proofs</li>
            </ul>
          </div>
          <div className="feature-card">
            <div className="feature-icon-box">
              <span>⚡</span>
            </div>
            <h3>Lightning Fast</h3>
            <p>Sub-millisecond query response times. Analyze blockchain data at scale with no latency compromises.</p>
            <ul className="feature-list">
              <li>Optimized indexing</li>
              <li>Parallel processing</li>
              <li>Smart caching</li>
            </ul>
          </div>
          <div className="feature-card">
            <div className="feature-icon-box">
              <span>🛡️</span>
            </div>
            <h3>Privacy First</h3>
            <p>Your raw data never leaves encrypted state. Only insights and aggregates are revealed to you.</p>
            <ul className="feature-list">
              <li>No data leakage</li>
              <li>Provenance tracked</li>
              <li>Audit ready</li>
            </ul>
          </div>
          <div className="feature-card">
            <div className="feature-icon-box">
              <span>🚀</span>
            </div>
            <h3>Blockchain Native</h3>
            <p>Built on Zcash and verified through CoFHE smart contracts. Full transparency and censorship resistance.</p>
            <ul className="feature-list">
              <li>Smart contracts</li>
              <li>Verifiable results</li>
              <li>On-chain proofs</li>
            </ul>
          </div>
          <div className="feature-card">
            <div className="feature-icon-box">
              <span>📈</span>
            </div>
            <h3>Real-time Insights</h3>
            <p>Live network metrics with instant alerts. Monitor shielded transactions, gas fees, and more.</p>
            <ul className="feature-list">
              <li>Live dashboards</li>
              <li>Custom metrics</li>
              <li>Historical data</li>
            </ul>
          </div>
          <div className="feature-card">
            <div className="feature-icon-box">
              <span>🔗</span>
            </div>
            <h3>Multi-Mode</h3>
            <p>Switch between normal analytics and privacy-preserved modes. Choose your privacy level per query.</p>
            <ul className="feature-list">
              <li>Mode switching</li>
              <li>Granular control</li>
              <li>No redeployment</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-header">
          <h2>The Process</h2>
          <p>From data to encrypted insights in 4 steps</p>
        </div>
        <div className="steps-container">
          <div className="step">
            <div className="step-circle">1</div>
            <div className="step-content">
              <h3>Ingest</h3>
              <p>Stream real-time blockchain data from Zcash network</p>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-circle">2</div>
            <div className="step-content">
              <h3>Encrypt</h3>
              <p>Apply homomorphic encryption on client-side</p>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-circle">3</div>
            <div className="step-content">
              <h3>Store</h3>
              <p>Securely store in nilDB vault with provenance</p>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-circle">4</div>
            <div className="step-content">
              <h3>Analyze</h3>
              <p>Get privacy-safe insights via AI summaries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="tech" id="tech">
        <div className="section-header">
          <h2>Built With</h2>
          <p>Cutting-edge privacy and blockchain technologies</p>
        </div>
        <div className="tech-grid">
          <div className="tech-item">
            <div className="tech-icon">🔐</div>
            <h4>Fhenix</h4>
            <p>CoFHE FHE</p>
          </div>
          <div className="tech-item">
            <div className="tech-icon">🔒</div>
            <h4>Nillion</h4>
            <p>nilDB + nilAI</p>
          </div>
          <div className="tech-item">
            <div className="tech-icon">⛓️</div>
            <h4>Zcash</h4>
            <p>Privacy Chain</p>
          </div>
          <div className="tech-item">
            <div className="tech-icon">⚙️</div>
            <h4>React</h4>
            <p>Frontend</p>
          </div>
          <div className="tech-item">
            <div className="tech-icon">🟢</div>
            <h4>Node.js</h4>
            <p>Backend</p>
          </div>
          <div className="tech-item">
            <div className="tech-icon">📦</div>
            <h4>Vite</h4>
            <p>Build Tool</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Query Encrypted Data?</h2>
          <p>Join the privacy-first analytics revolution</p>
          <button className="btn btn-primary btn-large" onClick={onEnter}>
            Launch Dashboard
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Nexa</h4>
            <p>Privacy analytics for blockchain</p>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="#docs">Documentation</a></li>
              <li><a href="#api">API Reference</a></li>
              <li><a href="#examples">Examples</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <ul>
              <li><a href="#twitter">Twitter</a></li>
              <li><a href="#github">GitHub</a></li>
              <li><a href="#discord">Discord</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Nexa. Privacy without compromise.</p>
        </div>
      </footer>
    </div>
  );
}
