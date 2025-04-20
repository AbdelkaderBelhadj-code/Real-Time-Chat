import React, { useState, useEffect } from 'react';

import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);
  
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" /> : <Login setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/chat" /> : <Register />} />
          <Route path="/chat" element={isAuthenticated ? <Chat setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;