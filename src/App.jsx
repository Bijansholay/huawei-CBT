import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Analytics } from '@vercel/analytics/react';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/student/Dashboard';
import ExamPage from './pages/student/ExamPage';
import ResultPage from './pages/student/ResultPage';

import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import StudentManagement from './pages/admin/StudentManagement';
import ExamManagement from './pages/admin/ExamManagement';
import QuestionBank from './pages/admin/QuestionBank';
import ResultManagement from './pages/admin/ResultManagement';
import AdminManagement from './pages/admin/AdminManagement';

function App() {
  return (
    <AuthProvider>
      <ExamProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            
            {/* Student Routes */}
            <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/exam/:id" element={<ProtectedRoute allowedRole="student"><ExamPage /></ProtectedRoute>} />
            <Route path="/student/result/:id" element={<ProtectedRoute allowedRole="student"><ResultPage /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="exams" element={<ExamManagement />} />
              <Route path="questions" element={<QuestionBank />} />
              <Route path="results" element={<ResultManagement />} />
              <Route path="admins" element={<AdminManagement />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Analytics />
      </ExamProvider>
    </AuthProvider>
  );
}

export default App;

