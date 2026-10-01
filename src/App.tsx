/**
 * Sabores & Nações - Plataforma Integrada de POS e Gestão de Restaurante em Portugal
 * 4 Módulos Independentes: Atendimento, Cozinha/Copa, Bar e Administração
 * Conforme requisitos: Ponto de Venda, Comanda Digital, Mesas, KDS, BDS, Caixa e Faturação Certificada (Vendus / AT)
 */

import React, { useState, useEffect } from 'react';
import { store, AppState } from './services/storage';
import { Navbar } from './components/Navbar';
import { OperatorModal } from './components/OperatorModal';
import { ValidationScenarioModal } from './components/ValidationScenarioModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ShiftHandoverModal } from './components/ShiftHandoverModal';
import { PortalView } from './views/PortalView';
import { WaiterView } from './views/WaiterView';
import { KitchenView } from './views/KitchenView';
import { BarView } from './views/BarView';
import { AdminHubView } from './views/AdminHubView';
import { ModuleType, FiscalDocument, User } from './types';
import {
  UtensilsCrossed,
  Flame,
  Wine,
  ShieldCheck,
  Home,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>(store.getState());

  // Obter módulo inicial a partir dos parâmetros de URL (?modulo=atendimento, ?page=atendimento ou #atendimento)
  const getInitialModuleFromUrl = (): ModuleType | 'portal' => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase().replace('#', '');
      const paramMod =
        searchParams.get('modulo') ||
        searchParams.get('module') ||
        searchParams.get('page') ||
        searchParams.get('tab') ||
        hash;

      if (
        paramMod === 'atendimento' ||
        paramMod === 'garcom' ||
        paramMod === 'waiter' ||
        paramMod === 'mesas'
      ) {
        const curr = store.getState().currentUser;
        if (!store.canUserAccessModule(curr, 'atendimento')) {
          const waiterUser = store.getState().users.find((u) => u.role === 'waiter');
          if (waiterUser) {
            store.setCurrentUser(waiterUser);
          }
        }
        return 'atendimento';
      }
      if (paramMod === 'cozinha' || paramMod === 'kitchen' || paramMod === 'kds') return 'cozinha';
      if (paramMod === 'bar' || paramMod === 'bds') return 'bar';
      if (paramMod === 'admin' || paramMod === 'administracao') return 'admin';
      if (paramMod === 'portal') return 'portal';
    } catch (e) {
      console.error('Erro ao ler URL param', e);
    }
    const user = store.getState().currentUser;
    return store.getDefaultModuleForUser(user);
  };

  // Módulo ativo: 'portal' | 'atendimento' | 'cozinha' | 'bar' | 'admin'
  const [currentModule, setCurrentModule] = useState<ModuleType | 'portal'>(getInitialModuleFromUrl);

  // Modais
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [shiftHandoverModalOpen, setShiftHandoverModalOpen] = useState(false);
  const [activeReceiptDoc, setActiveReceiptDoc] = useState<FiscalDocument | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Sincroniza a URL com o módulo ativo para permitir link direto e favoritos
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('modulo', currentModule);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.error(e);
    }
  }, [currentModule]);

  // Escuta alterações de histórico e hash
  useEffect(() => {
    const handleUrlChange = () => {
      const targetMod = getInitialModuleFromUrl();
      setCurrentModule(targetMod);
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleSelectModule = (mod: ModuleType | 'portal') => {
    if (mod === 'portal') {
      setCurrentModule('portal');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validação estrita de autorização em tempo de execução
    if (store.canUserAccessModule(state.currentUser, mod)) {
      setCurrentModule(mod);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Bloqueio de acesso não autorizado
      alert(
        `Acesso Não Autorizado: A sua conta (${state.currentUser.name} - ${state.currentUser.role}) não tem permissão para aceder ao módulo "${mod}".`
      );
    }
  };

  const handleUserLoginSuccess = (newUser: User) => {
    // Encaminha automaticamente para o módulo apropriado conforme a função
    const defaultMod = store.getDefaultModuleForUser(newUser);
    setCurrentModule(defaultMod);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Verificação de autorização para o módulo atual
  const isAuthorizedForCurrent =
    currentModule === 'portal' || store.canUserAccessModule(state.currentUser, currentModule);

  const isAdminOrManager =
    state.currentUser.role === 'admin' || state.currentUser.role === 'manager';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white pb-20 md:pb-6">
      {/* Top Navbar Multi-Módulo */}
      <Navbar
        currentModule={currentModule}
        onSelectModule={handleSelectModule}
        currentUser={state.currentUser}
        onOpenOperatorModal={() => setOperatorModalOpen(true)}
        onOpenScenarioModal={() => setScenarioModalOpen(true)}
        onOpenShiftHandoverModal={() => setShiftHandoverModalOpen(true)}
        tables={state.tables}
        comandas={state.comandas}
        products={state.products}
        isOnline={state.isOnline}
        soundEnabled={state.settings.soundAlertsEnabled}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6">
        {!isAuthorizedForCurrent ? (
          /* Ecrã de Bloqueio de Acesso Não Autorizado */
          <div className="bg-stone-900 border border-rose-900/60 rounded-3xl p-8 max-w-md mx-auto text-center space-y-4 shadow-2xl mt-12">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Acesso Restrito ao Módulo</h2>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                A sua conta individual ({state.currentUser.name} — <strong className="capitalize">{state.currentUser.role}</strong>)
                não possui permissões para visualizar este módulo.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => handleSelectModule(store.getDefaultModuleForUser(state.currentUser))}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Ir para o Meu Módulo Autorizado
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Portal Geral de Módulos */}
            {currentModule === 'portal' && (
              <PortalView
                state={state}
                onSelectModule={handleSelectModule}
                onOpenOperatorModal={() => setOperatorModalOpen(true)}
                onOpenScenarioModal={() => setScenarioModalOpen(true)}
              />
            )}

            {/* 2. Módulo Atendimento (Empregado de Mesa) */}
            {currentModule === 'atendimento' && (
              <WaiterView
                state={state}
                onSelectTab={(tab) => {
                  if (tab === 'mesas') handleSelectModule('atendimento');
                  else if (tab === 'cozinha') handleSelectModule('cozinha');
                  else if (tab === 'caixa' || tab === 'painel') handleSelectModule('admin');
                }}
              />
            )}

            {/* 3. Módulo Cozinha / Copa */}
            {currentModule === 'cozinha' && (
              <KitchenView
                state={state}
                onSelectTab={(tab) => {
                  if (tab === 'atendimento') handleSelectModule('atendimento');
                  else if (tab === 'bar') handleSelectModule('bar');
                  else if (tab === 'painel') handleSelectModule('admin');
                }}
              />
            )}

            {/* 4. Módulo Bar */}
            {currentModule === 'bar' && (
              <BarView
                state={state}
                onSelectTab={(tab) => {
                  if (tab === 'atendimento') handleSelectModule('atendimento');
                  else if (tab === 'cozinha') handleSelectModule('cozinha');
                  else if (tab === 'painel') handleSelectModule('admin');
                }}
              />
            )}

            {/* 5. Módulo Administração */}
            {currentModule === 'admin' && (
              <AdminHubView
                state={state}
                onViewReceipt={(doc) => setActiveReceiptDoc(doc)}
                onSwitchModule={handleSelectModule}
              />
            )}
          </>
        )}
      </main>

      {/* Barra de Navegação Rápida no Fundo para Dispositivos Móveis / Tablets */}
      <nav className="fixed bottom-0 inset-x-0 bg-stone-950/95 backdrop-blur border-t border-stone-800 z-30 md:hidden flex justify-around p-1.5 no-print">
        {isAdminOrManager ? (
          <>
            <button
              onClick={() => handleSelectModule('portal')}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold ${
                currentModule === 'portal' ? 'text-amber-400 font-bold' : 'text-stone-400'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Portal</span>
            </button>

            <button
              onClick={() => handleSelectModule('atendimento')}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold ${
                currentModule === 'atendimento' ? 'text-amber-400 font-bold' : 'text-stone-400'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Atendimento</span>
            </button>

            <button
              onClick={() => handleSelectModule('cozinha')}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold ${
                currentModule === 'cozinha' ? 'text-orange-400 font-bold' : 'text-stone-400'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Cozinha</span>
            </button>

            <button
              onClick={() => handleSelectModule('bar')}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold ${
                currentModule === 'bar' ? 'text-cyan-400 font-bold' : 'text-stone-400'
              }`}
            >
              <Wine className="w-4 h-4" />
              <span>Bar</span>
            </button>

            <button
              onClick={() => handleSelectModule('admin')}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold ${
                currentModule === 'admin' ? 'text-purple-400 font-bold' : 'text-stone-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </>
        ) : (
          /* Navegação personalizada para a função do utilizador */
          <>
            {state.currentUser.role === 'waiter' && (
              <>
                <button
                  onClick={() => handleSelectModule('atendimento')}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-bold text-amber-400"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Comandas</span>
                </button>
                <button
                  onClick={() => setShiftHandoverModalOpen(true)}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold text-stone-400"
                >
                  <Home className="w-4 h-4" />
                  <span>Passar Turno</span>
                </button>
              </>
            )}

            {state.currentUser.role === 'kitchen' && (
              <button
                onClick={() => handleSelectModule('cozinha')}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-bold text-orange-400"
              >
                <Flame className="w-4 h-4" />
                <span>KDS Cozinha</span>
              </button>
            )}

            {state.currentUser.role === 'bar' && (
              <button
                onClick={() => handleSelectModule('bar')}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-bold text-cyan-400"
              >
                <Wine className="w-4 h-4" />
                <span>BDS Bar</span>
              </button>
            )}

            {state.currentUser.role === 'cashier' && (
              <button
                onClick={() => handleSelectModule('admin')}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-bold text-purple-400"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Caixa & Faturas</span>
              </button>
            )}

            <button
              onClick={() => setOperatorModalOpen(true)}
              className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold text-stone-400"
            >
              <span className="text-sm">{state.currentUser.avatar}</span>
              <span>Operador</span>
            </button>
          </>
        )}
      </nav>

      {/* Modal de Troca de Operador */}
      <OperatorModal
        isOpen={operatorModalOpen}
        onClose={() => setOperatorModalOpen(false)}
        currentUser={state.currentUser}
        users={state.users}
        onLoginSuccess={handleUserLoginSuccess}
      />

      {/* Modal de Demonstração do Cenário Obrigatório (14 Critérios) */}
      <ValidationScenarioModal
        isOpen={scenarioModalOpen}
        onClose={() => setScenarioModalOpen(false)}
        state={state}
        onSelectModule={handleSelectModule}
        onViewReceipt={(doc) => setActiveReceiptDoc(doc)}
      />

      {/* Modal de Impressão e Visualização do Recibo Certificado */}
      <ReceiptModal
        document={activeReceiptDoc}
        settings={state.settings}
        currentUser={state.currentUser}
        onClose={() => setActiveReceiptDoc(null)}
      />

      {/* Modal de Passagem de Turno */}
      <ShiftHandoverModal
        isOpen={shiftHandoverModalOpen}
        onClose={() => setShiftHandoverModalOpen(false)}
        state={state}
      />
    </div>
  );
}
