
import React from 'react';
import { Link } from 'react-router';

function LandingPage() {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Welcome to Leaddrboard</h1>
          <p className="py-6">Login or Register to access the dashboard.</p>
          <div className="flex justify-center gap-4">
            <Link to="/login" className="btn btn-primary">Login</Link>
            <br />
            <Link to="/register" className="btn btn-secondary">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
