import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('username', response.data.username);
      setIsAuthenticated(true);
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred during login');
    }
  };
  
  return (
    <div className="auth-container">
      <h2>Login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default Login;
