// Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ setToken }) {  // Add setToken prop
  const [formData, setFormData] = useState({
    userEmail: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_SOCKET_SERVER}/login`, 
        formData
      );

      const accessToken = response.data.data.accessToken;
      const userId = response.data.data?.user?._id;

      // Update both localStorage and state
      localStorage.setItem('token', accessToken);
      localStorage.setItem('userId', userId);
      setToken(accessToken); // Update the token state in App.js

      // Navigate after everything is updated
      navigate('/location');
      
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component remains the same
  return (
    <div>
    <div>
      <div>
        <h2>Sign in to your account</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div>
            {error}
          </div>
        )}

        <div>
          <div>
            <label htmlFor="userEmail">Email address</label>
            <input
              id="userEmail"
              name="userEmail"
              type="email"
              required
              placeholder="Email address"
              value={formData.userEmail}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}

export default Login;