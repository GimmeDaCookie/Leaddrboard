import React from 'react';
import { Link } from 'react-router';
import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="flex-1">
        <Link to="/home" className="btn btn-ghost text-xl">Leaddrboard</Link>
      </div>
      <div className="flex-none gap-2">
        {user && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.username} />
                ) : (
                  <div className="bg-neutral text-neutral-content w-full h-full flex items-center justify-center">
                    <User size={20} />
                  </div>
                )}
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
              <li>
                <Link to={user.username ? `/profile/${user.username}` : '/profile'} className="justify-between">
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/profile/manage">
                  Manage Profile
                </Link>
              </li>
              <li>
                <a onClick={handleLogout} className="text-error">
                  Logout
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;