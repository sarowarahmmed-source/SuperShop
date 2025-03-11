import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Inventory from './pages/Inventory';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <h1>Inventory Management System</h1>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Inventory />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;