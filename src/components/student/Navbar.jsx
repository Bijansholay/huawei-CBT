import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Bell, BookOpen, Terminal } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current route path
  const isLabsActive = location.pathname.startsWith('/student/simulator');
  const isQuestionsActive = !isLabsActive;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/40 border-b border-gray-200/50 transition-all">
      <nav className="px-4 py-3 md:px-6 max-w-5xl mx-auto flex justify-between items-center">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => navigate('/student')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">
            Huawei <span className="text-brand-600 font-medium">CBT</span>
          </span>
        </div>
        
        {/* Navigation Bar: Practice Questions & Labs Tab Switcher */}
        {user?.role === 'student' && (
          <div className="bg-gray-200/70 p-1 rounded-full border border-gray-300/40 flex items-center gap-1 shadow-inner backdrop-blur-sm">
            <button
              onClick={() => navigate('/student')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                isQuestionsActive
                  ? 'bg-white text-brand-700 shadow-sm font-bold scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
              title="Switch to Practice Questions"
            >
              <BookOpen size={15} className={isQuestionsActive ? 'text-brand-600' : 'text-gray-500'} />
              <span>Practice Questions</span>
            </button>

            <button
              onClick={() => navigate('/student/simulator')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                isLabsActive
                  ? 'bg-white text-indigo-700 shadow-sm font-bold scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
              title="Switch to Practice Labs"
            >
              <Terminal size={15} className={isLabsActive ? 'text-indigo-600' : 'text-gray-500'} />
              <span>Practice Labs</span>
            </button>
          </div>
        )}

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button className="icon-button" title="Notifications">
            <Bell size={18} />
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="icon-button"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>
    </header>
  );
}

