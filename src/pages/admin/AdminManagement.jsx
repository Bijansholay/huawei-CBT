import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2, UserCog, X } from 'lucide-react';
import { createAdmin, deleteAdmin, listAdmins, updateAdmin } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ email: '', surname: '', password: '' });
  const [editForm, setEditForm] = useState({ email: '', surname: '', password: '' });
  const [editingAdminId, setEditingAdminId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const canManageAdmins = Boolean(user?.isSuperAdmin);

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
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await listAdmins();
        if (!cancelled) setAdmins(data.admins || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load admins');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAdmins = admins.filter((admin) => {
    const text = `${admin.email || ''} ${admin.surname || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!canManageAdmins) return;
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

  const startEdit = (admin) => {
    setEditingAdminId(admin.id);
    setEditForm({
      email: admin.email || '',
      surname: admin.surname || '',
      password: ''
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingAdminId('');
    setEditForm({ email: '', surname: '', password: '' });
    setError('');
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!canManageAdmins || !editingAdminId) return;
    setIsSaving(true);
    setError('');

    try {
      await updateAdmin(editingAdminId, editForm);
      cancelEdit();
      await loadAdmins();
    } catch (err) {
      setError(err.message || 'Failed to update admin');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (adminId) => {
    if (!canManageAdmins) return;
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

      {canManageAdmins ? (
        <form onSubmit={editingAdminId ? handleUpdate : handleCreate} className="soft-card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {editingAdminId ? 'Edit Admin' : 'Add Admin'}
              </h2>
              <p className="text-xs text-gray-500">
                {editingAdminId ? 'Update an existing admin account.' : 'Create a new admin account.'}
              </p>
            </div>
            {editingAdminId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                <X size={16} />
                Cancel
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Email</label>
              <input
                type="email"
                required
                value={editingAdminId ? editForm.email : form.email}
                onChange={(event) => {
                  const value = event.target.value;
                  if (editingAdminId) {
                    setEditForm({ ...editForm, email: value });
                  } else {
                    setForm({ ...form, email: value });
                  }
                }}
                disabled={editingAdminId && admins.find((admin) => admin.id === editingAdminId)?.isSuperAdmin}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Name</label>
              <input
                type="text"
                value={editingAdminId ? editForm.surname : form.surname}
                onChange={(event) => {
                  const value = event.target.value;
                  if (editingAdminId) {
                    setEditForm({ ...editForm, surname: value });
                  } else {
                    setForm({ ...form, surname: value });
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                placeholder="Admin name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">
                {editingAdminId ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                required={!editingAdminId}
                minLength={editingAdminId ? 0 : 8}
                value={editingAdminId ? editForm.password : form.password}
                onChange={(event) => {
                  const value = event.target.value;
                  if (editingAdminId) {
                    setEditForm({ ...editForm, password: value });
                  } else {
                    setForm({ ...form, password: value });
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                placeholder={editingAdminId ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="pill-button bg-gray-900 text-white flex items-center justify-center hover:bg-black disabled:opacity-60"
            >
              {editingAdminId ? 'Save' : (<><Plus size={16} className="mr-1.5" /> Add</>)}
            </button>
          </div>
        </form>
      ) : (
        <div className="soft-card p-5 mb-6 text-sm text-gray-600">
          Admin management is limited to the super admin account.
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{admin.surname || 'Admin'}</p>
                      {admin.isSuperAdmin && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase tracking-wide">
                          Super admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{admin.email}</p>
                  </div>
                </div>
                {canManageAdmins ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(admin)}
                      className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit admin"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(admin.id)}
                      disabled={admin.isSuperAdmin}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                      title={admin.isSuperAdmin ? 'Super admin cannot be deleted' : 'Delete admin'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  admin.isSuperAdmin && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                      Protected
                    </span>
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
