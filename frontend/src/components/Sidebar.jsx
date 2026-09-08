import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import {
  LayoutDashboard,
  Users,
  LogOut,
  UserCircle,
  Trophy,
  Settings,
  ChevronRight,
} from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
  const navItems = [
    {
      to: '/',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    ...(user?.role?.toLowerCase() === 'admin'
      ? [
          {
            to: '/admin',
            label: 'Administration',
            icon: Users,
          },
        ]
      : []),
  ];

  return (
    <aside className="sidebar-pro">
      {/* Header / Logo */}
      <div>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Trophy size={21} strokeWidth={2.5} />
          </div>

          <div className="logo-content">
            <span className="logo-title"> S.I.G.R</span>
            <span className="logo-subtitle">Management Match</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-section-title">
          MENU PRINCIPAL
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-nav-link ${isActive ? 'active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="nav-icon">
                    <Icon size={19} strokeWidth={2} />
                  </div>

                  <span>{label}</span>

                  {isActive && (
                    <ChevronRight
                      className="nav-arrow"
                      size={16}
                      strokeWidth={2.5}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="sidebar-bottom">
        {/* User profile */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          <div className="user-info">
            <div className="user-name">
              {user?.name || 'Utilisateur'}
            </div>

            <div className="user-position">
              {user?.position || 'Membre'}
            </div>
          </div>

          <UserCircle
            size={18}
            className="user-profile-icon"
          />
        </div>

        {/* Rating */}
        <div className="rating-card">
          <div>
            <span className="rating-label">ÉVALUATION</span>
            <span className="rating-value">
              {user?.rating ?? '—'}
            </span>
          </div>

          <div className="rating-star">★</div>
        </div>
        {/* Logout */}
        <button
          onClick={onLogout}
          className="sidebar-logout"
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;