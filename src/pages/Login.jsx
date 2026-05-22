import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({ matric: '', surname: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await login({ ...formData, role });
    setIsLoading(false);
    navigate(role === 'student' ? '/student' : '/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm soft-card p-6 relative z-10"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pastel-purple text-brand-600 mb-4">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to your assessment portal</p>
        </div>

        <div className="flex p-1 bg-gray-50 rounded-full mb-6">
          <button
            type="button"
            className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-all ${
              role === 'student' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setRole('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-all ${
              role === 'admin' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'student' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Matric Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-200 text-sm outline-none text-gray-900"
                    placeholder="e.g. CST/2021/001"
                    value={formData.matric}
                    onChange={(e) => setFormData({ ...formData, matric: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Surname</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-200 text-sm outline-none text-gray-900"
                    placeholder="Your surname"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Admin ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-200 text-sm outline-none text-gray-900"
                    placeholder="Admin ID"
                    value={formData.matric}
                    onChange={(e) => setFormData({ ...formData, matric: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-200 text-sm outline-none text-gray-900"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 rounded-full text-sm font-medium text-white bg-gray-900 hover:bg-black transition-colors disabled:opacity-70 mt-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>Sign In <ArrowRight size={16} className="ml-1.5" /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
