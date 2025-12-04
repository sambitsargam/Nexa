import React, { useState } from 'react';
import './App.css';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return showDashboard ? (
    <Dashboard onBack={() => setShowDashboard(false)} />
  ) : (
    <LandingPage onEnter={() => setShowDashboard(true)} />
  );
}
