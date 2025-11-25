import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
} from "react-router";
import './index.css';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SongPage from './pages/SongPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import Header from './components/Header.jsx';
import AddScorePage from './pages/AddScorePage.jsx';
import ManageProfilePage from './pages/ManageProfilePage.jsx';

const Layout = () => (
  <div>
    <Header />
    <Outlet />
  </div>
);

const NavigateToProfile = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.username) {
    return <Navigate to={`/profile/${user.username}`} replace />;
  }
  return <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: "/home",
            element: <HomePage />,
          },
          {
            path: "/song/:songName",
            element: <SongPage />,
          },
          {
            path: "/profile",
            element: <NavigateToProfile />,
          },
          {
            path: "/profile/:username",
            element: <ProfilePage />,
          },
          {
            path: "/addScore",
            element: <AddScorePage />
          },
          {
            path: "/profile/manage",
            element: <ManageProfilePage />
          }
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);