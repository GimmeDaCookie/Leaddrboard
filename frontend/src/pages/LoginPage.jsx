
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import axios from '../axios';

function LoginPage() {
  // const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { data } = await axios.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">Welcome Back!</h1>
          <p className="py-6">Sign in to track your scores and compete on the leaderboard.</p>
        </div>
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <form className="card-body" onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input 
                type="text" 
                placeholder="username" 
                className="input input-bordered" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input 
                type="password" 
                placeholder="password" 
                className="input input-bordered" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-error text-center text-sm">{error}</p>}
            <div className="form-control mt-6">
              <button className="btn btn-primary text-white">Login</button>
            </div>
            <div className="text-center mt-4">
              Don't have an account? <Link to="/register" className="link link-primary">Register</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
