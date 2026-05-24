import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, FileText, Database, LogOut, Award } from 'lucide-react';

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Exams', path: '/admin/exams', icon: FileText },
    { name: 'Question Bank', path: '/admin/questions', icon: Database },
    { name: 'Results', path: '/admin/results', icon: Award },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col z-20 shadow-sm relative">
        <div className="h-20 flex items-center px-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-pastel-purple flex items-center justify-center">
              <span className="text-brand-600 font-bold text-sm">A</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900">Admin Portal</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Menu</p>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-2xl text-sm font-medium transition-all ${isActive
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className={`mr-3 h-4 w-4`} />
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-red-500 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 scroll-smooth">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
