import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  Trash2,
  Edit,
  History,
  CheckCircle2,
  XCircle,
  X,
  Check,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { User, UserRole, ModuleType, AuditLog } from '../types';
import { formatTime } from '../utils/formatters';

interface UsersViewProps {
  state: AppState;
}

export const UsersView: React.FC<UsersViewProps> = ({ state }) => {
  const { users, currentUser, auditLogs } = state;

  const [activeTab, setActiveTab] = useState<'utilizadores' | 'auditoria'>('utilizadores');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('waiter');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [allowedModules, setAllowedModules] = useState<ModuleType[]>(['atendimento']);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');

  const roleLabels: Record<UserRole, { label: string; desc: string; icon: string }> = {
    admin: {
      label: 'Administrador',
      desc: 'Acesso total aos 4 módulos, faturação, caixa, configurações e gestão de equipa.',
      icon: '👨‍💼',
    },
    manager: {
      label: 'Gerente Operacional',
      desc: 'Supervisão de salas, aprovação de descontos, retificações e monitorização KDS/Bar.',
      icon: '👩‍💼',
    },
    waiter: {
      label: 'Empregado de Mesa',
      desc: 'Módulo Atendimento: abertura de comandas, envio de rondas e entrega de pratos.',
      icon: '🤵',
    },
    kitchen: {
      label: 'Equipa Cozinha / Copa',
      desc: 'Módulo Cozinha: KDS exclusivo para preparação de pratos e pastelaria.',
      icon: '👨‍🍳',
    },
    bar: {
      label: 'Equipa do Bar',
      desc: 'Módulo Bar: BDS exclusivo para preparação de bebidas, cafés e coquetéis.',
      icon: '🍸',
    },
    cashier: {
      label: 'Operador de Caixa',
      desc: 'Módulo Administração: sessões de caixa, pagamentos mistos e fecho.',
      icon: '👩‍💻',
    },
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('waiter');
    setPin('1234');
    setAvatar('🤵');
    setAllowedModules(['atendimento']);
    setActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPin(user.pin);
    setAvatar(user.avatar || '👤');
    setAllowedModules(user.allowedModules || [store.getDefaultModuleForUser(user)]);
    setActive(user.active !== false);
    setFormError('');
    setModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setAvatar(roleLabels[newRole].icon);
    // Sugere módulos padrão para a função
    if (newRole === 'admin' || newRole === 'manager') {
      setAllowedModules(['atendimento', 'cozinha', 'bar', 'admin']);
    } else if (newRole === 'waiter') {
      setAllowedModules(['atendimento']);
    } else if (newRole === 'kitchen') {
      setAllowedModules(['cozinha']);
    } else if (newRole === 'bar') {
      setAllowedModules(['bar']);
    } else if (newRole === 'cashier') {
      setAllowedModules(['admin']);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('O nome do funcionário é obrigatório');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setFormError('O PIN numérico deve conter pelo menos 4 dígitos');
      return;
    }

    try {
      const userToSave: User = {
        id: editingUser ? editingUser.id : `u-${Date.now()}`,
        name: name.trim(),
        email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@saboresenacoes.pt`,
        role,
        pin: pin.trim(),
        avatar,
        active,
        allowedModules,
      };

      store.saveUser(userToSave, currentUser);
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao guardar utilizador');
    }
  };

  const handleToggleStatus = (u: User) => {
    try {
      store.toggleUserStatus(u.id, !(u.active !== false), currentUser);
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar estado');
    }
  };

  const handleDeleteUser = (u: User) => {
    if (confirm(`Tem a certeza que deseja eliminar a conta de ${u.name}?`)) {
      try {
        store.deleteUser(u.id, currentUser);
      } catch (err: any) {
        alert(err.message || 'Erro ao remover utilizador');
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/90 p-4 md:p-5 rounded-2xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Utilizadores & Permissões</h1>
            <p className="text-xs text-stone-400">
              Contas individuais com controle de acesso rigoroso por módulo (Atendimento, Cozinha, Bar e Administração)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setActiveTab('utilizadores')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'utilizadores' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-white'
              }`}
            >
              Equipa ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'auditoria' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Auditoria ({auditLogs.length})</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Criar Utilizador</span>
          </button>
        </div>
      </div>

      {activeTab === 'utilizadores' ? (
        <div className="space-y-4">
          {/* Pesquisa */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar funcionário por nome, email ou função..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="text-xs text-stone-400 hidden sm:block">
              {filteredUsers.length} funcionários registados
            </div>
          </div>

          {/* Grelha de Utilizadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const info = roleLabels[u.role] || { label: u.role, desc: '', icon: '👤' };
              const isActive = u.active !== false;
              const isCurrent = u.id === currentUser.id;

              return (
                <div
                  key={u.id}
                  className={`bg-stone-900 rounded-2xl border p-4 shadow-xl flex flex-col justify-between transition-all ${
                    !isActive
                      ? 'border-rose-900/40 bg-stone-950/40 opacity-70'
                      : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-1 bg-stone-950 rounded-xl border border-stone-800">
                          {u.avatar || info.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-white">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-amber-400 font-semibold">{info.label}</div>
                          <div className="text-[11px] text-stone-500">{u.email}</div>
                        </div>
                      </div>

                      {/* Estado Ativo/Inativo */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                        }`}
                      >
                        {isActive ? 'Ativo' : 'Desativado'}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-400 leading-snug">{info.desc}</p>

                    {/* Módulos Autorizados */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Módulos Autorizados:</div>
                      <div className="flex flex-wrap gap-1">
                        {u.role === 'admin' || u.role === 'manager' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-semibold">
                            Todos os 4 Módulos
                          </span>
                        ) : (
                          (u.allowedModules || [store.getDefaultModuleForUser(u)]).map((m) => (
                            <span
                              key={m}
                              className="text-[10px] capitalize px-2 py-0.5 rounded-md bg-stone-800 text-amber-300 font-mono font-semibold"
                            >
                              {m}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="pt-3 mt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-stone-500">PIN: ****</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={isCurrent && isActive}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isActive
                            ? 'bg-stone-800 hover:bg-rose-950 text-stone-300 hover:text-rose-300 border-stone-700'
                            : 'bg-stone-800 hover:bg-emerald-950 text-stone-300 hover:text-emerald-300 border-stone-700'
                        }`}
                        title={isActive ? 'Desativar acesso deste utilizador' : 'Ativar acesso deste utilizador'}
                      >
                        {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors"
                        title="Editar utilizador"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {!isCurrent && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 border border-stone-700 transition-colors"
                          title="Eliminar utilizador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Aba de Auditoria de Operações */
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 md:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                Histórico de Auditoria & Segurança Operacional
              </h3>
              <p className="text-xs text-stone-400">
                Registo imutável de todas as operações sensíveis, autor, módulo e data/hora
              </p>
            </div>
            <span className="text-xs text-stone-500 font-mono">{auditLogs.length} eventos registados</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              Nenhuma operação auditada registada nesta sessão.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-stone-950 border border-stone-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.userName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 uppercase font-mono">
                        {log.userRole}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        {log.module}
                      </span>
                      <span className="font-mono text-stone-400 text-[11px] font-bold">{log.action}</span>
                    </div>
                    <p className="text-stone-300 text-xs">{log.details}</p>
                  </div>
                  <div className="text-stone-500 text-[10px] font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString('pt-PT')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Criar / Editar Utilizador */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveUser}
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 md:p-6 space-y-4 text-stone-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm md:text-base text-white">
                  {editingUser ? `Editar Utilizador: ${editingUser.name}` : 'Criar Nova Conta Individual'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-semibold">Nome Completo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Pereira"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-stone-400 font-semibold">Email / Login:</label>
                  <input
                    type="email"
                    placeholder="Ex: joao@saboresenacoes.pt"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-semibold">Função / Cargo no Restaurante:</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold mt-1 focus:border-amber-500 focus:outline-none"
                >
                  <option value="waiter">Empregado de Mesa (Atendimento)</option>
                  <option value="kitchen">Equipa Cozinha / Copa (KDS)</option>
                  <option value="bar">Equipa do Bar (BDS Bebidas)</option>
                  <option value="cashier">Operador de Caixa (Caixa & Faturas)</option>
                  <option value="manager">Gerente Operacional</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
                <p className="text-[10px] text-stone-500 mt-1">{roleLabels[role]?.desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    PIN Numérico (4 dígitos):
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Ex: 1234"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono mt-1 text-center text-sm tracking-widest focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-stone-400 font-semibold">Avatar / Ícone:</label>
                  <div className="flex gap-2 mt-1">
                    {['🤵', '👨‍🍳', '🍸', '👩‍💼', '👨‍💼', '👩‍💻'].map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setAvatar(emoji)}
                        className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center transition-all ${
                          avatar === emoji
                            ? 'bg-amber-600 border-amber-500 scale-110 shadow'
                            : 'bg-stone-950 border-stone-800 hover:bg-stone-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Módulos com Acesso Permitido */}
              <div className="space-y-1.5 pt-1">
                <label className="text-stone-300 font-bold">Módulos Autorizados para Esta Conta:</label>
                <div className="grid grid-cols-2 gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  {[
                    { id: 'atendimento' as ModuleType, label: 'Atendimento' },
                    { id: 'cozinha' as ModuleType, label: 'Cozinha / Copa' },
                    { id: 'bar' as ModuleType, label: 'Bar' },
                    { id: 'admin' as ModuleType, label: 'Administração' },
                  ].map((m) => {
                    const isChecked = allowedModules.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedModules([...allowedModules, m.id]);
                            } else {
                              setAllowedModules(allowedModules.filter((x) => x !== m.id));
                            }
                          }}
                          className="rounded border-stone-700 bg-stone-900 text-amber-600"
                        />
                        <span className={isChecked ? 'text-white font-bold' : 'text-stone-400'}>
                          {m.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Estado Ativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-900 text-amber-600"
                />
                <label htmlFor="userActive" className="text-stone-300 font-semibold cursor-pointer">
                  Conta Ativa (Desmarque para suspender ou desativar o acesso)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Guardar Conta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
