import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="px-4 py-4 md:px-6 max-w-5xl mx-auto flex justify-between items-center z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-pastel-purple flex items-center justify-center">
          <span className="text-brand-600 font-bold text-lg">T</span>
        </div>
        <span className="text-lg font-semibold text-gray-900 tracking-tight hidden sm:block">Huawei CBT</span>
      </div>
      
      <div className="flex items-center gap-4">
        {user?.role === 'student' && (
          <button 
            onClick={() => navigate('/student/simulator')}
            className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors mr-2 cursor-pointer"
          >
            Practice Labs
          </button>
        )}
        <button className="icon-button">
          <Bell size={18} />
        </button>
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="icon-button"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
