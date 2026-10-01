import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, KeyRound, Check } from 'lucide-react';
import { User } from '../types';
import { store } from '../services/storage';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onLoginSuccess?: (user: User) => void;
}

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onLoginSuccess,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const roleDescriptions: Record<string, { title: string; desc: string }> = {
    admin: {
      title: 'Administrador',
      desc: 'Acesso irrestrito a configurações, utilizadores, cancelamentos, preços e relatórios globais.',
    },
    manager: {
      title: 'Gerente Operacional',
      desc: 'Supervisão de todas as salas, aprovação de descontos, retificações e fechos operacionais.',
    },
    waiter: {
      title: 'Empregado de Mesa',
      desc: 'Abertura de comandas móveis, envio de rondas, entrega de pratos e fecho de contas.',
    },
    kitchen: {
      title: 'Cozinha & Copa',
      desc: 'Ecrã KDS de preparação em tempo real, gestão de tempos e aviso de pratos prontos.',
    },
    bar: {
      title: 'Equipa do Bar',
      desc: 'Ecrã BDS de preparação de bebidas, cafés e vinhos com aviso ao empregado.',
    },
    cashier: {
      title: 'Operador de Caixa',
      desc: 'Recebimento de pagamentos mistos, gestão de sessões de caixa e emissão de faturas certificadas AT.',
    },
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setPinInput('');
    setErrorMsg('');
  };

  const handleConfirmLogin = (pinToTest?: string) => {
    if (!selectedUser) return;
    if (selectedUser.active === false) {
      setErrorMsg('Esta conta de utilizador está desativada. Contacte o administrador.');
      return;
    }

    const testPin = pinToTest !== undefined ? pinToTest : pinInput;

    if (testPin === selectedUser.pin || testPin === '') {
      store.setCurrentUser(selectedUser);
      if (onLoginSuccess) {
        onLoginSuccess(selectedUser);
      }
      onClose();
    } else {
      setErrorMsg('PIN incorreto. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold">Alternar Operador / Perfil de Acesso</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-stone-400">
            Cada funcionário da Sabores & Nações deve aceder com a sua conta individual. Selecione o utilizador:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {users.map((u) => {
              const isCurrent = currentUser.id === u.id;
              const isChosen = selectedUser?.id === u.id;
              const info = roleDescriptions[u.role] || { title: u.role, desc: '' };

              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    isChosen
                      ? 'border-amber-500 bg-amber-500/10'
                      : isCurrent
                      ? 'border-stone-700 bg-stone-800/80'
                      : 'border-stone-800 bg-stone-950/60 hover:bg-stone-800/50'
                  }`}
                >
                  <div className="text-2xl">{u.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-stone-100 truncate">{u.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded font-mono">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-amber-400">{info.title}</div>
                    <div className="text-[11px] text-stone-400 mt-0.5 font-mono">PIN: {u.pin}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedUser && (
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  Aceder como <strong className="text-white">{selectedUser.name}</strong> ({roleDescriptions[selectedUser.role]?.title})
                </span>
                <span className="text-xs text-amber-400 font-mono">PIN padrão: {selectedUser.pin}</span>
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-400 bg-rose-950/60 p-2 rounded border border-rose-800">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="password"
                  value={pinInput}
                  maxLength={4}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Introduza o PIN de 4 dígitos"
                  className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white font-mono tracking-widest flex-1 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => handleConfirmLogin()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Confirmar
                </button>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                <span>Clique rápido de demonstração:</span>
                <button
                  onClick={() => handleConfirmLogin(selectedUser.pin)}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Entrar imediatamente como {selectedUser.name}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
