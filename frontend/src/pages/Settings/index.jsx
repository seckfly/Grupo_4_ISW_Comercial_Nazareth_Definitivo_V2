import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Power, Save, ShieldCheck, Store, UserRound, X } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { api } from '../../services/api';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'client', isActive: true };
export default function Settings() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editing = editingId !== null;
  const protectedAccess = users.find((user) => user.id === editingId)?.isProtected;
  const activeCount = useMemo(() => users.filter((user) => user.isActive).length, [users]);

  useEffect(() => {
    const controller = new AbortController();
    api.users(controller.signal).then(setUsers).catch((error) => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  }

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2500);
  }

  async function submit(event) {
    event.preventDefault();
    if (loading || saving) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const payload = { ...form, password: form.password || undefined };
      const saved = editing ? await api.updateUser(editingId, payload) : await api.createUser(payload);
      setUsers((current) => editing ? current.map((user) => user.id === saved.id ? saved : user) : [...current, saved]);
      resetForm();
      flash(editing ? 'Usuario actualizado correctamente.' : 'Credenciales creadas correctamente.');
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function editUser(user) {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive });
    setError('');
    document.querySelector('.credential-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function toggleUser(user) {
    if (user.isProtected || saving) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const saved = await api.updateUser(user.id, { isActive: !user.isActive });
      setUsers((current) => current.map((item) => item.id === saved.id ? saved : item));
      if (editingId === saved.id) setForm((current) => ({ ...current, isActive: saved.isActive }));
      flash(saved.isActive ? 'Acceso reactivado.' : 'Acceso suspendido.');
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="page settings-page">
    <PageHeader kicker="Administración" title="Configuración" description="Controla el negocio, los accesos y los datos de la cuenta." />
    <div className="settings-layout">
      <nav className="settings-nav">
        <button className="active"><KeyRound />Credenciales</button>
        <button><Store />Datos del negocio</button>
        <button><ShieldCheck />Seguridad</button>
      </nav>
      <div className="settings-main">
        <Card className="access-card">
          <div className="card-head">
            <div><p className="eyebrow">Control de acceso</p><h3>Usuarios y credenciales</h3></div>
            <span className="secure-label"><ShieldCheck />Solo administrador</span>
          </div>
          <div className="access-overview">
            <p>Administra quién puede ingresar y qué puede hacer dentro de Comercial Nazareth.</p>
            <div><strong>{users.length}</strong><span>usuarios</span></div>
            <div><strong>{activeCount}</strong><span>activos</span></div>
          </div>
          <div className="credential-list" aria-busy={loading}>
            {loading && <p role="status">Cargando usuarios…</p>}
            {users.map((user) => <article key={user.id} className={!user.isActive ? 'is-inactive' : ''}>
              <span className={`credential-avatar ${user.role}`}>{user.role === 'admin' ? <ShieldCheck /> : <UserRound />}</span>
              <div className="credential-identity"><strong>{user.name}</strong><small>{user.email}</small></div>
              <div className="credential-status">
                <span className={`status-dot ${user.isActive ? 'active' : ''}`}>{user.isActive ? 'Activo' : 'Suspendido'}</span>
              </div>
              <div className="credential-role"><span className={`role-badge ${user.role}`}>{user.role === 'admin' ? 'Administrador' : 'Cliente'}</span></div>
              <div className="credential-actions">
                <button type="button" disabled={saving} onClick={() => editUser(user)} aria-label={`Editar a ${user.name}`} title="Editar"><Pencil /></button>
                {!user.isProtected && <button type="button" disabled={saving} onClick={() => toggleUser(user)} aria-label={`${user.isActive ? 'Suspender' : 'Activar'} a ${user.name}`} title={user.isActive ? 'Suspender' : 'Activar'}><Power /></button>}
              </div>
            </article>)}
          </div>
        </Card>

        <Card className="credential-form">
          <div className="form-card-head">
            <div><p className="eyebrow">{editing ? 'Editar acceso' : 'Nuevo acceso'}</p><h3>{editing ? 'Actualizar credenciales' : 'Agregar credenciales'}</h3></div>
            {editing && <button type="button" className="cancel-edit" onClick={resetForm}><X />Cancelar</button>}
          </div>
          <form onSubmit={submit}>
            <div className="form-row">
              <label>Nombre completo<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellido" required /></label>
              <label>Correo<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="persona@correo.pe" required /></label>
            </div>
            <div className="form-row">
              <label>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña temporal'}<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" minLength={editing ? undefined : 8} placeholder={editing ? 'Déjala vacía para conservarla' : 'Mínimo 8 caracteres'} required={!editing} /></label>
              <label>Tipo de acceso<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={protectedAccess}><option value="client">Cliente</option><option value="admin">Administrador</option></select></label>
            </div>
            {editing && !protectedAccess && <label className="access-toggle"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span><strong>Acceso activo</strong><small>El usuario puede iniciar sesión en el sistema.</small></span></label>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="form-success" role="status">{notice}</p>}
            <button className="primary" disabled={loading || saving}>{editing ? <Save /> : <Plus />}{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear acceso'}</button>
          </form>
        </Card>

        <Card className="business-settings">
          <div><p className="eyebrow">Identidad comercial</p><h3>Datos del negocio</h3></div>
          <div className="form-row"><label>Nombre comercial<input defaultValue="Comercial Nazareth" /></label><label>Moneda<select defaultValue="PEN"><option value="PEN">Soles peruanos (S/)</option></select></label></div>
          <button className="secondary"><Save />Guardar cambios</button>
        </Card>
      </div>
    </div>
  </div>;
}
