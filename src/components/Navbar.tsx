import React, { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  Flame,
  Wine,
  Wallet,
  Receipt,
  FileCheck2,
  BookOpen,
  Users,
  Boxes,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  PlayCircle,
  ChevronDown,
  Globe,
  ArrowRightLeft,
  Bell,
  Layers,
  ShieldCheck,
  Home,
  CheckCircle2,
  Share2,
  Smartphone,
} from 'lucide-react';
import { User, Table, Comanda, Product, ModuleType } from '../types';
import { store } from '../services/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentModule: ModuleType | 'portal';
  onSelectModule: (module: ModuleType | 'portal') => void;
  currentUser: User;
  onOpenOperatorModal: () => void;
  onOpenScenarioModal: () => void;
  onOpenShiftHandoverModal?: () => void;
  tables: Table[];
  comandas: Comanda[];
  products: Product[];
  isOnline: boolean;
  soundEnabled: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModule,
  onSelectModule,
  currentUser,
  onOpenOperatorModal,
  onOpenScenarioModal,
  onOpenShiftHandoverModal,
  tables,
  comandas,
  products,
  isOnline,
  soundEnabled,
}) => {
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);

  // Contadores para badges em tempo real
  const activeComandas = comandas.filter((c) => c.status === 'aberta' || c.status === 'conta_solicitada');
  const occupiedTables = tables.filter((t) => t.status === 'ocupada' || t.status === 'conta_solicitada');
  const pendingTableCalls = tables.filter((t) => !!t.activeCall).length;

  // Prontos a entregar no atendimento
  const readyItemsCount = comandas.reduce((acc, c) => {
    return (
      acc +
      c.rounds.reduce((rAcc, r) => {
        return rAcc + r.items.filter((i) => i.status === 'pronto').length;
      }, 0)
    );
  }, 0);

  // Cozinha pendente
  const kitchenPending = comandas.reduce((acc, c) => {
    return (
      acc +
      c.rounds.reduce((rAcc, r) => {
        return (
          rAcc +
          r.items.filter(
            (i) => (i.sector === 'cozinha' || i.sector === 'pastelaria') && (i.status === 'recebido' || i.status === 'em_preparacao')
          ).length
        );
      }, 0)
    );
  }, 0);

  // Bar pendente
  const barPending = comandas.reduce((acc, c) => {
    return (
      acc +
      c.rounds.reduce((rAcc, r) => {
        return rAcc + r.items.filter((i) => i.sector === 'bar' && (i.status === 'recebido' || i.status === 'em_preparacao')).length;
      }, 0)
    );
  }, 0);

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente Operacional',
    waiter: 'Empregado de Mesa',
    kitchen: 'Cozinha / Copa',
    bar: 'Equipa do Bar',
    cashier: 'Operador de Caixa',
  };

  const moduleMeta: Record<ModuleType | 'portal', { label: string; icon: any; color: string; badge?: string | number }> = {
    portal: { label: 'Portal Inicial', icon: Home, color: 'text-stone-300' },
    atendimento: {
      label: 'Atendimento',
      icon: UtensilsCrossed,
      color: 'text-amber-400',
      badge: readyItemsCount > 0 ? `${readyItemsCount} pronto` : undefined,
    },
    cozinha: {
      label: 'Cozinha / Copa',
      icon: Flame,
      color: 'text-orange-400',
      badge: kitchenPending > 0 ? `${kitchenPending}` : undefined,
    },
    bar: {
      label: 'Bar',
      icon: Wine,
      color: 'text-cyan-400',
      badge: barPending > 0 ? `${barPending}` : undefined,
    },
    admin: {
      label: 'Administração',
      icon: ShieldCheck,
      color: 'text-purple-400',
      badge: activeComandas.filter((c) => c.status === 'conta_solicitada').length > 0 ? 'Conta!' : undefined,
    },
    faturacao: {
      label: 'Faturação & Notas',
      icon: FileCheck2,
      color: 'text-emerald-400',
    },
  };

  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';

  const handleSelectModuleSafe = (mod: ModuleType | 'portal') => {
    setModuleDropdownOpen(false);
    if (mod === 'portal') {
      onSelectModule('portal');
      return;
    }
    if (store.canUserAccessModule(currentUser, mod)) {
      onSelectModule(mod);
    } else {
      alert(`Acesso restrito: A sua conta individual (${currentUser.name} - ${roleLabels[currentUser.role]}) não possui permissão para aceder a este módulo.`);
    }
  };

  const CurrentIcon = moduleMeta[currentModule].icon;

  return (
    <header className="bg-stone-950 border-b border-stone-800 text-stone-200 select-none sticky top-0 z-40">
      {/* Top Banner com Marca, Módulo Atual, Utilizador e Ações Globais */}
      <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          {/* Logo & Marca */}
          <button
            onClick={() => onSelectModule('portal')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            title="Ir para a página inicial dos módulos"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 flex items-center justify-center shadow-lg shadow-orange-950/40 text-white font-extrabold text-lg border border-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
              S&N
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-base">
                  Sabores & Nações
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  PT
                </span>
              </div>
              <div className="text-[11px] text-stone-400">
                Sistema Multi-Módulo
              </div>
            </div>
          </button>

            {/* Seletor Visível do Módulo Atual */}
            <div className="relative">
              <button
                onClick={() => setModuleDropdownOpen(!moduleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 rounded-xl border border-stone-700/80 text-xs font-bold transition-all shadow-sm"
                title={isAdminOrManager ? "Alternar visão de módulo" : "Módulo em execução"}
              >
                <CurrentIcon className={`w-4 h-4 ${moduleMeta[currentModule].color}`} />
                <span className="text-white">{moduleMeta[currentModule].label}</span>
                {isAdminOrManager ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 ml-0.5" />
                ) : (
                  <span className="text-[10px] text-stone-400 font-normal hidden md:inline">• Individual</span>
                )}
              </button>

              {/* Menu Dropdown de Módulos (com permissões) */}
            {moduleDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in py-1">
                <div className="px-3 py-2 border-b border-stone-800 text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
                  <span>Selecionar Módulo</span>
                  {isAdminOrManager && <span className="text-purple-400">Admin</span>}
                </div>

                <button
                  onClick={() => handleSelectModuleSafe('portal')}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                    currentModule === 'portal' ? 'bg-amber-600/20 text-amber-300 font-bold' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-stone-400" />
                    <span>Portal Geral de Acesso</span>
                  </div>
                  {currentModule === 'portal' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                {(['atendimento', 'cozinha', 'bar', 'faturacao', 'admin'] as ModuleType[]).map((m) => {
                  const mData = moduleMeta[m];
                  const MIcon = mData.icon;
                  const isAuth = store.canUserAccessModule(currentUser, m);
                  const isCurrent = currentModule === m;

                  return (
                    <button
                      key={m}
                      onClick={() => handleSelectModuleSafe(m)}
                      disabled={!isAuth}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                        isCurrent
                          ? 'bg-amber-600/20 text-amber-300 font-bold'
                          : isAuth
                          ? 'text-stone-200 hover:bg-stone-800'
                          : 'text-stone-600 bg-stone-950/40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MIcon className={`w-4 h-4 ${mData.color}`} />
                        <span>{mData.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {mData.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300 font-bold font-mono">
                            {mData.badge}
                          </span>
                        )}
                        {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botão Visível: Voltar ao Portal Geral */}
          {currentModule !== 'portal' && (
            <button
              onClick={() => onSelectModule('portal')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-800 text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Voltar ao Portal Geral de Módulos"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>Voltar ao Portal Geral</span>
            </button>
          )}
        </div>

        {/* Central & Direita: Teste Obrigatório, Turno, Som, Utilizador */}
        <div className="flex items-center gap-2">
          {/* Cenário Obrigatório de Teste (Highlight) */}
          <button
            onClick={onOpenScenarioModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 border border-emerald-400/40"
            title="Abrir o Cenário Obrigatório de Validação (14 Critérios)"
          >
            <PlayCircle className="w-4 h-4" />
            <span className="hidden lg:inline">Cenário de Teste (14 Passos)</span>
            <span className="lg:hidden">Testes</span>
          </button>

          {/* Toggle Online/Offline para resiliência */}
          <button
            onClick={() => store.setOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/50'
                : 'bg-rose-950/60 text-rose-300 border-rose-600 animate-pulse'
            }`}
            title="Alternar estado de ligação (modo offline)"
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span className="hidden xl:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </button>

          {/* Som on/off */}
          <button
            onClick={() =>
              store.saveSettings({
                ...store.getState().settings,
                soundAlertsEnabled: !soundEnabled,
              })
            }
            className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors"
            title={soundEnabled ? 'Alertas sonoros ativos' : 'Alertas sonoros silenciados'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {/* Passagem de Turno */}
          {onOpenShiftHandoverModal && (
            <button
              onClick={onOpenShiftHandoverModal}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-xl border border-stone-800 transition-colors"
              title="Passagem de turno"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Passar Turno</span>
            </button>
          )}

          {/* Botão para Copiar / Abrir Link Direto do Atendimento */}
          <button
            onClick={() => {
              const url = `${window.location.origin}/?modulo=atendimento`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(url);
              }
              alert(`Link Direto do Garçom / Atendimento:\n\n${url}\n\n(Copiado para a área de transferência! Pode abrir diretamente em qualquer telemóvel ou tablet).`);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 text-xs font-bold rounded-xl border border-amber-800/80 transition-all shadow-sm"
            title="Copiar link direto para abrir no telemóvel do garçom"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Link Garçom</span>
          </button>

          {/* Instalação PWA */}
          <PWAInstallButton />

          {/* Operador Ativo */}
          <button
            onClick={onOpenOperatorModal}
            className="flex items-center gap-2 pl-2 pr-2.5 sm:pr-3 py-1 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl border border-stone-800 text-xs font-medium transition-all"
            title="Alternar utilizador / conta individual"
          >
            <span className="text-base leading-none">{currentUser.avatar}</span>
            <div className="text-left hidden sm:block">
              <div className="font-bold text-stone-200 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] text-amber-400 leading-none">
                {roleLabels[currentUser.role] || currentUser.role}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Banner de Modo Offline */}
      {!isOnline && (
        <div className="bg-rose-950 text-rose-200 text-xs font-semibold px-4 py-1.5 flex items-center justify-between border-b border-rose-800 animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-400" />
            <span>
              Modo Offline: novos pedidos e itens são salvaguardados em cache no dispositivo. Faturação certificada em pausa até restabelecimento.
            </span>
          </div>
          <button
            onClick={() => store.setOnline(true)}
            className="underline hover:text-white text-[11px] font-bold"
          >
            Reconectar
          </button>
        </div>
      )}
    </header>
  );
};
