import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BarChart3, CreditCard, Edit, ExternalLink, Folder, LayoutGrid, Lock, LogOut, PanelLeftClose, PanelLeftOpen, Plus, Search, Shield, Trash2, Users } from "lucide-react";
import { api, clearLaunchedApps, clearSession, getLaunchedApps, getStoredUser, getToken, Menu, rememberLaunchedApp, Role, User } from "../api/client";

const emptyRole = { code: "", name: "", description: "" };
const emptyUser = { username: "", name: "", password: "", role: "finance", isActive: true };
const emptyMenu = {
  code: "",
  name: "",
  division: "",
  description: "",
  targetUrl: "",
  defaultPath: "/",
  requiresLogin: true,
  allowedRoles: [] as string[],
  isActive: true,
};

export default function App() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"launcher" | "roles" | "users" | "menus">("launcher");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [roleForm, setRoleForm] = useState(emptyRole);
  const [editingRoleId, setEditingRoleId] = useState("");
  const [userForm, setUserForm] = useState(emptyUser);
  const [editingUserId, setEditingUserId] = useState("");
  const [menuForm, setMenuForm] = useState(emptyMenu);
  const [editingMenuId, setEditingMenuId] = useState("");
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [deleteMenuLoading, setDeleteMenuLoading] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [formModal, setFormModal] = useState<"role" | "user" | "menu" | null>(null);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const isSuperuser = currentUser?.role === "superuser";
  const visibleMenus = useMemo(() => menus.filter((menu) => menu.isActive), [menus]);
  const filteredMenus = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return visibleMenus;
    return visibleMenus.filter((menu) => [menu.name, menu.division, menu.description, menu.targetUrl].filter(Boolean).some((value) => value!.toLowerCase().includes(keyword)));
  }, [search, visibleMenus]);
  const pageMeta = {
    launcher: {
      title: "Launcher Aplikasi",
      description: "Pilih program internal yang ingin dibuka.",
    },
    roles: {
      title: "Master Role",
      description: "Kelola role akses yang bisa dipakai user dan menu aplikasi.",
    },
    users: {
      title: "Master User",
      description: "Kelola akun karyawan yang dapat login ke Program Internal.",
    },
    menus: {
      title: "Master Menu",
      description: "Daftarkan program internal yang akan tampil di launcher.",
    },
  }[activeTab];
  const topbarTitle = activeTab === "launcher" ? "LaunchPad" : pageMeta.title;

  useEffect(() => {
    loadData();
  }, []);

  if (!getToken() || !currentUser) return <Navigate to="/login" replace />;

  async function loadData() {
    setLoading(true);
    try {
      const [roleList, menuList] = await Promise.all([api.roles(), api.menus()]);
      setRoles(roleList);
      setMenus(menuList);
      if (getStoredUser()?.role === "superuser") setUsers(await api.users());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    getLaunchedApps().forEach((targetUrl) => {
      const iframe = document.createElement("iframe");
      iframe.src = `${targetUrl}/sso/logout?silent=1`;
      iframe.hidden = true;
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);
      window.setTimeout(() => iframe.remove(), 5000);
    });
    clearLaunchedApps();
    clearSession();
    navigate("/login");
  }

  async function launch(menu: Menu) {
    setMessage("");
    const programWindow = window.open("about:blank", "_blank");

    if (!programWindow) {
      setMessage("Browser memblokir tab baru. Izinkan pop-up untuk membuka program.");
      return;
    }

    programWindow.opener = null;
    try {
      const { url } = await api.launch(menu._id);
      if (menu.requiresLogin) rememberLaunchedApp(menu.targetUrl);
      programWindow.location.href = url;
    } catch (err) {
      programWindow.close();
      setMessage(err instanceof Error ? err.message : "Menu tidak bisa dibuka.");
    }
  }

  async function submitRole(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (editingRoleId) await api.updateRole(editingRoleId, roleForm);
      else await api.createRole(roleForm);
      setRoleForm(emptyRole);
      setEditingRoleId("");
      setFormModal(null);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan role.");
    }
  }

  async function submitUser(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (editingUserId) await api.updateUser(editingUserId, userForm);
      else await api.createUser(userForm);
      setUserForm({ ...emptyUser, role: roles[0]?.code || "finance" });
      setEditingUserId("");
      setFormModal(null);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan user.");
    }
  }

  async function submitMenu(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (editingMenuId) await api.updateMenu(editingMenuId, menuForm);
      else await api.createMenu(menuForm);
      setMenuForm(emptyMenu);
      setEditingMenuId("");
      setFormModal(null);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan menu.");
    }
  }

  function openRoleForm(role?: Role) {
    setEditingRoleId(role?._id || "");
    setRoleForm(role ? { code: role.code, name: role.name, description: role.description || "" } : emptyRole);
    setFormModal("role");
  }

  function openUserForm(user?: User) {
    setEditingUserId(user?._id || "");
    setUserForm(user ? { ...user, password: "" } : { ...emptyUser, role: roles[0]?.code || "finance" });
    setFormModal("user");
  }

  function openMenuForm(menu?: Menu) {
    setEditingMenuId(menu?._id || "");
    setMenuForm(
      menu
        ? { code: menu.code, name: menu.name, division: menu.division, description: menu.description || "", targetUrl: menu.targetUrl, defaultPath: menu.defaultPath, requiresLogin: menu.requiresLogin !== false, allowedRoles: menu.allowedRoles, isActive: menu.isActive }
        : emptyMenu
    );
    setFormModal("menu");
  }

  function closeFormModal() {
    setFormModal(null);
    setEditingRoleId("");
    setEditingUserId("");
    setEditingMenuId("");
    setRoleForm(emptyRole);
    setUserForm({ ...emptyUser, role: roles[0]?.code || "finance" });
    setMenuForm(emptyMenu);
  }

  async function confirmDeleteMenu() {
    if (!menuToDelete) return;

    setMessage("");
    setDeleteMenuLoading(true);
    try {
      await api.deleteMenu(menuToDelete._id);
      if (editingMenuId === menuToDelete._id) {
        setEditingMenuId("");
        setMenuForm(emptyMenu);
      }
      setMenuToDelete(null);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menghapus menu.");
    } finally {
      setDeleteMenuLoading(false);
    }
  }

  return (
    <div className={`app-shell ${!isSuperuser ? "app-shell-plain" : ""} ${isSuperuser && sidebarHidden ? "sidebar-hidden" : ""}`}>
      {isSuperuser && !sidebarHidden && (
        <aside className="sidebar">
          <div className="sidebar-title">
            <div className="sidebar-brand">
              <span className="brand-mark">EH</span>
              <span>
                <strong>Enterprise Hub</strong>
                <small>Internal Tools</small>
              </span>
            </div>
            <button className="sidebar-toggle" type="button" onClick={() => setSidebarHidden(true)} title="Sembunyikan sidebar" aria-label="Sembunyikan sidebar">
              <PanelLeftClose size={20} />
            </button>
          </div>
          <nav>
            <button className={activeTab === "launcher" ? "active" : ""} onClick={() => setActiveTab("launcher")}>
              <LayoutGrid size={18} /> LaunchPad
            </button>
              <button className={activeTab === "roles" ? "active" : ""} onClick={() => setActiveTab("roles")}>
                <Shield size={18} /> Role
              </button>
              <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
                <Users size={18} /> User
              </button>
              <button className={activeTab === "menus" ? "active" : ""} onClick={() => setActiveTab("menus")}>
                <Folder size={18} /> Menu
              </button>
          </nav>
        </aside>
      )}

      <main className="content">
        <header className="topbar">
          <div className="topbar-heading">
            {isSuperuser && sidebarHidden && (
              <button className="icon-button" type="button" onClick={() => setSidebarHidden(false)} title="Tampilkan sidebar" aria-label="Tampilkan sidebar">
                <PanelLeftOpen size={20} />
              </button>
            )}
            <h1>{topbarTitle}</h1>
          </div>
          {activeTab === "launcher" && (
            <label className="search-field" aria-label="Cari program">
              <Search size={19} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari program..." />
            </label>
          )}
          <div className="topbar-actions">
            <div className="profile-menu">
              <button className="avatar-button" type="button" title={`${currentUser.name} / ${currentUser.role}`} aria-label="Profil user" onClick={() => setProfileOpen((value) => !value)}>
                {(currentUser.name || currentUser.username).slice(0, 1).toUpperCase()}
                <span className="avatar-chevron" aria-hidden="true" />
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div>
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.role}</span>
                  </div>
                  <button type="button" onClick={logout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {message && <div className="alert">{message}</div>}
        {loading && <div className="muted">Memuat data...</div>}

        {!loading && activeTab === "launcher" && (
          <section className="launcher-section">
            <div className="welcome-panel">
              <div>
                <p className="welcome-kicker">WORKSPACE / LAUNCHPAD</p>
                <h2>Program yang tersedia untuk Anda</h2>
              </div>
              <p>Akses cepat ke aplikasi internal sesuai dengan role dan kebutuhan kerja Anda.</p>
            </div>
            <div className="launcher-grid">
              {filteredMenus.map((menu) => (
                <LauncherCard
                  key={menu._id}
                  menu={menu}
                  canAccess={isSuperuser || menu.allowedRoles.includes(currentUser.role)}
                  onLaunch={() => launch(menu)}
                />
              ))}
              {filteredMenus.length === 0 && <div className="empty-state">Belum ada program yang cocok atau bisa dibuka oleh role Anda.</div>}
            </div>
          </section>
        )}

        {!loading && isSuperuser && activeTab === "roles" && (
          <section className="master-page">
            <DataTable
              title="Data Role"
              count={roles.length}
              columns={["Kode", "Nama", "Deskripsi", "Aksi"]}
              action={
                <button className="primary-button table-action-button" onClick={() => openRoleForm()}>
                  <Plus size={16} /> Tambah Role
                </button>
              }
            >
              {roles.map((role) => (
                <tr key={role._id}>
                  <td>{role.code}</td>
                  <td>{role.name}</td>
                  <td>{role.description}</td>
                  <td className="actions">
                    <button onClick={() => openRoleForm(role)}><Edit size={16} /></button>
                    <button disabled={role.isSystem} onClick={async () => { await api.deleteRole(role._id); await loadData(); }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>
        )}

        {!loading && isSuperuser && activeTab === "users" && (
          <section className="master-page">
            <DataTable
              title="Data User"
              count={users.length}
              columns={["Username", "Nama", "Role", "Status", "Aksi"]}
              action={
                <button className="primary-button table-action-button" onClick={() => openUserForm()}>
                  <Plus size={16} /> Tambah User
                </button>
              }
            >
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td><span className={user.isActive ? "status-pill active" : "status-pill"}>{user.isActive ? "Aktif" : "Nonaktif"}</span></td>
                  <td className="actions">
                    <button onClick={() => openUserForm(user)}><Edit size={16} /></button>
                    <button onClick={async () => { await api.deleteUser(user._id); await loadData(); }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>
        )}

        {!loading && isSuperuser && activeTab === "menus" && (
          <section className="master-page">
            <DataTable
              title="Data Menu Aplikasi"
              count={menus.length}
              columns={["Nama Program", "Divisi", "Halaman Awal", "Login SSO", "Role yang Diizinkan", "Aksi"]}
              action={
                <button className="primary-button table-action-button" onClick={() => openMenuForm()}>
                  <Plus size={16} /> Tambah Menu
                </button>
              }
            >
              {menus.map((menu) => (
                <tr key={menu._id}>
                  <td>{menu.name}</td>
                  <td>{menu.division}</td>
                  <td>{menu.defaultPath}</td>
                  <td>{menu.requiresLogin ? "Ya" : "Tidak"}</td>
                  <td>
                    <div className="role-chip-list">
                      {menu.allowedRoles.map((role) => (
                        <span className="role-chip" key={role}>{role}</span>
                      ))}
                    </div>
                  </td>
                  <td className="actions">
                    <button onClick={() => openMenuForm(menu)}><Edit size={16} /></button>
                    <button onClick={() => setMenuToDelete(menu)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>
        )}
      </main>

      {menuToDelete && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setMenuToDelete(null)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-menu-title" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-icon">
              <Trash2 size={22} />
            </div>
            <h2 id="delete-menu-title">Hapus Menu Aplikasi?</h2>
            <p>
              Menu <strong>{menuToDelete.name}</strong> akan dihapus dari daftar menu aplikasi. Akses role untuk menu ini juga ikut hilang.
            </p>
            <div className="dialog-actions">
              <button className="secondary-button" type="button" onClick={() => setMenuToDelete(null)} disabled={deleteMenuLoading}>
                Batal
              </button>
              <button className="danger-button" type="button" onClick={confirmDeleteMenu} disabled={deleteMenuLoading}>
                <Trash2 size={18} />
                {deleteMenuLoading ? "Menghapus..." : "Hapus Menu"}
              </button>
            </div>
          </section>
        </div>
      )}

      {formModal === "role" && (
        <FormDialog title={editingRoleId ? "Edit Role" : "Tambah Role"} onClose={closeFormModal}>
          <form className="modal-form" onSubmit={submitRole}>
            <input placeholder="Kode role" value={roleForm.code} disabled={!!editingRoleId} onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })} required />
            <input placeholder="Nama role" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} required />
            <textarea placeholder="Deskripsi" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={closeFormModal}>Batal</button>
              <button className="primary-button" type="submit">Simpan Role</button>
            </div>
          </form>
        </FormDialog>
      )}

      {formModal === "user" && (
        <FormDialog title={editingUserId ? "Edit User" : "Tambah User"} onClose={closeFormModal}>
          <form className="modal-form" onSubmit={submitUser}>
            <input placeholder="Username/email" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required />
            <input placeholder="Nama" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
            <input placeholder={editingUserId ? "Password baru, opsional" : "Password"} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!editingUserId} />
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              {roles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
            </select>
            <label className="checkbox-row">
              <input type="checkbox" checked={userForm.isActive} onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })} />
              Aktif
            </label>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={closeFormModal}>Batal</button>
              <button className="primary-button" type="submit">Simpan User</button>
            </div>
          </form>
        </FormDialog>
      )}

      {formModal === "menu" && (
        <FormDialog title={editingMenuId ? "Edit Menu" : "Tambah Menu"} onClose={closeFormModal}>
          <form className="modal-form" onSubmit={submitMenu}>
            <input placeholder="Kode menu" value={menuForm.code} disabled={!!editingMenuId} onChange={(e) => setMenuForm({ ...menuForm, code: e.target.value })} required />
            <input placeholder="Nama menu" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required />
            <input placeholder="Divisi" value={menuForm.division} onChange={(e) => setMenuForm({ ...menuForm, division: e.target.value })} required />
            <input placeholder="Target URL, contoh http://localhost:8080" value={menuForm.targetUrl} onChange={(e) => setMenuForm({ ...menuForm, targetUrl: e.target.value })} required />
            <input placeholder="Halaman awal program, contoh /dashboard" value={menuForm.defaultPath} onChange={(e) => setMenuForm({ ...menuForm, defaultPath: e.target.value })} />
            <textarea placeholder="Deskripsi" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} />
            <label className="checkbox-row">
              <input type="checkbox" checked={menuForm.requiresLogin} onChange={(e) => setMenuForm({ ...menuForm, requiresLogin: e.target.checked })} />
              Website memerlukan login (gunakan SSO)
            </label>
            <div className="role-picker">
              {roles.map((role) => (
                <label key={role.code}>
                  <input
                    type="checkbox"
                    checked={menuForm.allowedRoles.includes(role.code)}
                    onChange={(event) => {
                      const allowedRoles = event.target.checked
                        ? [...menuForm.allowedRoles, role.code]
                        : menuForm.allowedRoles.filter((item) => item !== role.code);
                      setMenuForm({ ...menuForm, allowedRoles });
                    }}
                  />
                  {role.name}
                </label>
              ))}
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={menuForm.isActive} onChange={(e) => setMenuForm({ ...menuForm, isActive: e.target.checked })} />
              Aktif
            </label>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={closeFormModal}>Batal</button>
              <button className="primary-button" type="submit">Simpan Menu</button>
            </div>
          </form>
        </FormDialog>
      )}
    </div>
  );
}

function LauncherCard({ canAccess, menu, onLaunch }: { canAccess: boolean; menu: Menu; onLaunch: () => void }) {
  return (
    <article className={`menu-card ${!canAccess ? "menu-card-locked" : ""}`}>
      <div className="menu-card-header">
        <div className="menu-card-label">
          <span className="menu-code">{menu.code}</span>
          <span className="division">{menu.division}</span>
        </div>
        <span className="menu-icon-tile">
          {menu.division.toLowerCase().includes("finance") ? <CreditCard size={20} /> : menu.division.toLowerCase().includes("report") || menu.name.toLowerCase().includes("analytic") ? <BarChart3 size={20} /> : <Folder size={20} />}
        </span>
      </div>
      <div className="menu-card-body">
        <h2>{menu.name}</h2>
        <p>{menu.description || menu.targetUrl}</p>
      </div>
      <div className="menu-card-footer">
        <span className={`menu-access ${canAccess ? "is-available" : "is-locked"}`}>
          <span className="access-dot" />
          {canAccess ? "Akses tersedia" : "Akses dibatasi"}
        </span>
        <button className={canAccess ? "primary-button" : "locked-button"} onClick={onLaunch} disabled={!canAccess}>
          {canAccess ? <ExternalLink size={16} /> : <Lock size={15} />}
          {canAccess ? "Buka" : "Terkunci"}
        </button>
      </div>
    </article>
  );
}

function DataTable({ action, children, columns, count, description, title }: { action?: React.ReactNode; children: React.ReactNode; columns: string[]; count?: number; description?: string; title: string }) {
  return (
    <div className="table-wrap">
      <div className="table-title">
        <div>
          <div className="table-heading-row">
            <h2>{title}</h2>
            {typeof count === "number" && <span className="table-count">{count} data</span>}
          </div>
          {description && <p>{description}</p>}
        </div>
        {action && <div className="table-title-actions">{action}</div>}
      </div>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function FormDialog({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="form-dialog-title" onClick={(event) => event.stopPropagation()}>
        <div className="form-dialog-header">
          <h2 id="form-dialog-title">{title}</h2>
          <button className="secondary-button" type="button" onClick={onClose}>Tutup</button>
        </div>
        {children}
      </section>
    </div>
  );
}
