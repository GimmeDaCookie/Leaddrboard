import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeftIcon } from 'lucide-react';
import api from '../axios';

function ManageProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    profilePicture: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Load current user data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setFormData(prev => ({
      ...prev,
      username: userData.username || '',
      profilePicture: userData.profilePicture || ''
    }));
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match if changing password
    if (formData.newPassword || formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      const updateData = {
        username: formData.username,
        profilePicture: formData.profilePicture
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      const { data } = await api.put('/users/profile', updateData);
      
      // Update local storage with new user data
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...currentUser,
        username: data.username,
        profilePicture: data.profilePicture
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccess('Profile updated successfully!');
      setFormData(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }));

      // Redirect to profile page after a short delay
      setTimeout(() => {
        navigate(`/profile/${data.username}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-300 text-base-content">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link to={`/profile/${formData.username}`} className="btn btn-ghost btn-sm gap-2 pl-0 hover:bg-transparent">
            <ArrowLeftIcon size={16} />
            Back to Profile
          </Link>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Manage Profile</h2>

            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success mb-4">
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Username</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Profile Picture URL</span>
                </label>
                <input
                  type="url"
                  name="profilePicture"
                  value={formData.profilePicture}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                  className="input input-bordered w-full"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Enter a URL to an image (optional)
                  </span>
                </label>
              </div>

              <div className="divider">Change Password (Optional)</div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="card-actions justify-end mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary text-white"
                >
                  {loading ? <span className="loading loading-spinner"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageProfilePage;
