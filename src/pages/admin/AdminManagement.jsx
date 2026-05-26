import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, UserCog } from 'lucide-react';
import { createAdmin, deleteAdmin, listAdmins } from '../../services/api';

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ email: '', surname: '', password: '' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadAdmins() {
    setIsLoading(true);
    setError('');
    try {
      const data = await listAdmins();
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err.message || 'Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredAdmins = admins.filter((admin) => {
    const text = `${admin.email || ''} ${admin.surname || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await createAdmin(form);
      setForm({ email: '', surname: '', password: '' });
      await loadAdmins();
    } catch (err) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (adminId) => {
    setError('');
    try {
      await deleteAdmin(adminId);
      await loadAdmins();
    } catch (err) {
      setError(err.message || 'Failed to delete admin');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Admins</h1>
          <p className="text-gray-500 text-sm">Manage dashboard access</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="soft-card p-5 mb-6">
        <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Name</label>
            <input
              type="text"
              value={form.surname}
              onChange={(event) => setForm({ ...form, surname: event.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
              placeholder="Admin name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
              placeholder="Minimum 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="pill-button bg-gray-900 text-white flex items-center justify-center hover:bg-black disabled:opacity-60"
          >
            <Plus size={16} className="mr-1.5" /> Add
          </button>
        </div>
      </form>

      <div className="soft-card overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search admins..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading admins...</div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No admins found.</div>
          ) : (
            filteredAdmins.map((admin) => (
              <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <UserCog size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{admin.surname || 'Admin'}</p>
                    <p className="text-xs text-gray-500">{admin.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(admin.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete admin"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
