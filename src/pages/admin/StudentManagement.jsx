import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createStudent, deleteStudent, listStudents, updateStudent } from '../../services/api';

export default function StudentManagement() {
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [editingStudentId, setEditingStudentId] = useState('');
  const [form, setForm] = useState({ matricNumber: '', surname: '', email: '', password: '' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadStudents() {
    setIsLoading(true);
    setError('');
    try {
      const data = await listStudents();
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => loadStudents()).catch(() => {});
  }, []);

  const filteredStudents = students.filter((student) => {
    const text = `${student.matricNumber || ''} ${student.surname || ''} ${student.email || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const resetForm = () => {
    setEditingStudentId('');
    setForm({ matricNumber: '', surname: '', email: '', password: '' });
    setShowModal(false);
  };

  const startCreate = () => {
    setEditingStudentId('');
    setForm({ matricNumber: '', surname: '', email: '', password: '' });
    setShowModal(true);
  };

  const startEdit = (student) => {
    setEditingStudentId(student.id);
    setForm({
      matricNumber: student.matricNumber || '',
      surname: student.surname || '',
      email: student.email || '',
      password: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingStudentId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        if (!payload.email) payload.email = null;
        await updateStudent(editingStudentId, payload);
        setSuccess('Student updated successfully.');
      } else {
        await createStudent(form);
        setSuccess('Student added successfully.');
      }
      resetForm();
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Failed to save student');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (studentId) => {
    setError('');
    try {
      await deleteStudent(studentId);
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Failed to delete student');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Students</h1>
          <p className="text-gray-500 text-sm">Manage enrolled candidates</p>
        </div>
        <button
          onClick={startCreate}
          className="pill-button bg-gray-900 text-white flex items-center hover:bg-black"
        >
          <Plus size={16} className="mr-1.5" /> Add Student
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      <div className="soft-card overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No students found.</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/50 text-[11px] uppercase font-bold tracking-widest text-gray-400">
                <tr>
                  <th className="px-6 py-4">Matric</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs font-medium text-gray-900">{student.matricNumber || '-'}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{student.surname || 'Student'}</td>
                    <td className="px-6 py-3 text-gray-500">{student.email || 'No email'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(student)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(student.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">{editingStudentId ? 'Edit Student' : 'Add Student'}</h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-900">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Matric Number</label>
                    <input
                      type="text"
                      required
                      value={form.matricNumber}
                      onChange={(event) => setForm({ ...form, matricNumber: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Surname</label>
                    <input
                      type="text"
                      required
                      value={form.surname}
                      onChange={(event) => setForm({ ...form, surname: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">
                      {editingStudentId ? 'New Password' : 'Password'}
                    </label>
                    <input
                      type="password"
                      required={!editingStudentId}
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                      placeholder={editingStudentId ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
                    />
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-2">
                  <button type="button" onClick={resetForm} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSaving} className="pill-button bg-gray-900 text-white disabled:opacity-60">
                    {isSaving ? 'Saving...' : 'Save Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
