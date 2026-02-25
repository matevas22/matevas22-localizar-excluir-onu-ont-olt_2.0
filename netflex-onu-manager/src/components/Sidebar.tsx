// src/components/Sidebar.tsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Activity,
  User,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { UserData } from "../types";
import logo from "../img/logo/logo-white.png";
import "../styles/Sidebar.css";

interface SidebarProps {
  user: UserData;
  onLogout: () => void;
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      path: "/home",
      icon: LayoutDashboard,
      label: "Painel",
      roles: ["tech", "admin"],
    },
    {
      path: "/locate",
      icon: Search,
      label: "Localizar",
      roles: ["tech", "admin"],
    },
    {
      path: "/diagnosis",
      icon: Activity,
      label: "Sinal",
      roles: ["tech", "admin"],
    },
    {
      path: "/olts",
      icon: Settings,
      label: "OLTs",
      roles: ["admin"],
    },
    { path: "/profile", icon: User, label: "Perfil", roles: ["tech", "admin"] },
    { path: "/admin", icon: Shield, label: "Admin", roles: ["admin"] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`sidebar-container ${
          isCollapsed ? "collapsed" : "expanded"
        }`}
      >
        <div className="sidebar-header">
          {!isCollapsed && (
            <img src={logo} alt="NETFLEX" className="sidebar-logo" />
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`sidebar-toggle-btn ${isCollapsed ? "centered" : ""}`}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? "active" : "inactive"} ${
                  isCollapsed ? "centered" : ""
                }`}
              >
                <item.icon
                  size={20}
                  className={`nav-icon ${isActive ? "active" : ""}`}
                />

                {!isCollapsed && (
                  <span className="nav-label">{item.label}</span>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && <div className="nav-tooltip">{item.label}</div>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className={`user-profile ${isCollapsed ? "centered" : ""}`}>
            <div className="user-avatar">{user.username[0].toUpperCase()}</div>
            {!isCollapsed && (
              <div className="user-info">
                <p className="user-name">{user.username}</p>
                <p className="user-role">{user.role}</p>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className={`logout-btn ${isCollapsed ? "centered" : ""}`}
            title={isCollapsed ? "Sair" : ""}
          >
            <LogOut size={20} className="nav-icon" />
            {!isCollapsed && <span className="logout-text">Sair</span>}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-link ${
                location.pathname === item.path ? "active" : "inactive"
              }`}
            >
              <item.icon size={20} />
              <span className="mobile-nav-label">{item.label}</span>
            </Link>
          ))}
        <button onClick={onLogout} className="mobile-logout-btn">
          <LogOut size={20} />
          <span className="mobile-nav-label">Sair</span>
        </button>
      </div>

      {/* Mobile Header */}
      <div className="mobile-header">
        <h2 className="mobile-logo">NETFLEX</h2>
        <div className="mobile-avatar">{user.username[0].toUpperCase()}</div>
      </div>
    </>
  );
};

export default Sidebar;
