import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
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
      const response = await axios.post('http://localhost:5000/login', formData);
      
      if (response.data.success) {
        console.log("Resoinbse>>>>>",response.data)
        // Store the token in localStorage
        localStorage.setItem('token', response.data.data.accessToken);
        // Store user data if needed
        localStorage.setItem('userId', response.data.data?.user?._id);
        
        // Redirect to dashboard or home page
        navigate('/location');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div >
        <div>
          <h2 >
            Sign in to your account
          </h2>
        </div>
        
        <form  onSubmit={handleSubmit}>
          {error && (
            <div >
              {error}
            </div>
          )}
          
          <div >
            <div>
              <label htmlFor="userEmail" >Email address</label>
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
              <label htmlFor="password" >Password</label>
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
            <button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;