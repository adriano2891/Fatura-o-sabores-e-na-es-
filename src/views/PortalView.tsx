/**
 * Sabores & Nações - Portal Geral de Acesso (Dashboard Central)
 * Página inicial da aplicação: cartões compactos, responsivos e dinâmicos
 * Exibe apenas os módulos autorizados para o perfil do utilizador ativo
 */

import React, { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Flame,
  Wine,
  Wallet,
  FileCheck2,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  UserCheck,
  CheckCircle2,
  Lock,
  PlayCircle,
  Users,
  Grid3X3,
  Receipt,
  Sparkles,
  Wifi,
  WifiOff,
  DollarSign,
  AlertTriangle,
  Layers,
  ChevronRight,
  Eye,
  Filter,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { ModuleType, User } from '../types';
import { formatCurrency, getElapsedMinutes } from '../utils/formatters';

interface PortalViewProps {
  state: AppState;
  onSelectModule: (module: ModuleType, subTab?: string) => void;
  onOpenOperatorModal: () => void;
  onOpenScenarioModal: () => void;
}

export const PortalView: React.FC<PortalViewProps> = ({
  state,
  onSelectModule,
  onOpenOperatorModal,
  onOpenScenarioModal,
}) => {
  const {
    currentUser,
    tables,
    comandas,
    products,
    sales,
    fiscalDocuments,
    cashSessions,
    onlineOrders,
    isOnline,
    settings,
    users,
  } = state;

  const [unauthorizedAttemptModule, setUnauthorizedAttemptModule] = useState<{
    name: string;
    required: string;
  } | null>(null);

  // Filtro opcional para gestores/administradores verem todos ou apenas específicos
  const [showAllModulesForAdmin, setShowAllModulesForAdmin] = useState(true);

  // 1. Métricas em Tempo Real para os Indicadores
  const occupiedTablesCount = tables.filter(
    (t) => t.status === 'ocupada' || t.status === 'conta_solicitada'
  ).length;

  const pendingCallsCount = tables.filter((t) => !!t.activeCall).length;

  const readyToDeliverCount = comandas.reduce(
    (acc, c) =>
      acc +
      c.rounds.reduce(
        (rAcc, r) => rAcc + r.items.filter((i) => i.status === 'pronto').length,
        0
      ),
    0
  );

  const openComandasCount = comandas.filter(
    (c) => c.status === 'aberta' || c.status === 'conta_solicitada'
  ).length;

  // Cozinha: pratos a preparar e atrasados
  const kitchenPendingCount = comandas.reduce(
    (acc, c) =>
      acc +
      c.rounds.reduce(
        (rAcc, r) =>
          rAcc +
          r.items.filter(
            (i) =>
              (i.sector === 'cozinha' || i.sector === 'pastelaria') &&
              (i.status === 'recebido' || i.status === 'em_preparacao')
          ).length,
        0
      ),
    0
  );

  const kitchenDelayedCount = comandas.reduce((acc, c) => {
    return (
      acc +
      c.rounds.filter((r) => {
        const hasKitchenItems = r.items.some(
          (i) =>
            (i.sector === 'cozinha' || i.sector === 'pastelaria') &&
            (i.status === 'recebido' || i.status === 'em_preparacao')
        );
        if (!hasKitchenItems) return false;
        const elapsed = getElapsedMinutes(r.createdAt);
        return elapsed >= settings.expectedPrepTimeMinutes + settings.delayToleranceMinutes;
      }).length
    );
  }, 0);

  // Bar: bebidas a preparar e prontas no balcão
  const barPendingCount = comandas.reduce(
    (acc, c) =>
      acc +
      c.rounds.reduce(
        (rAcc, r) =>
          rAcc +
          r.items.filter(
            (i) => i.sector === 'bar' && (i.status === 'recebido' || i.status === 'em_preparacao')
          ).length,
        0
      ),
    0
  );

  const barReadyCount = comandas.reduce(
    (acc, c) =>
      acc +
      c.rounds.reduce(
        (rAcc, r) => rAcc + r.items.filter((i) => i.sector === 'bar' && i.status === 'pronto').length,
        0
      ),
    0
  );

  // Caixa: contas solicitadas e pagamentos de hoje
  const requestedBillsCount = comandas.filter((c) => c.status === 'conta_solicitada').length;
  const activeCashSession = cashSessions.find((s) => s.status === 'aberto');
  const totalReceivedToday = sales
    .filter((s) => s.paidAmount > 0)
    .reduce((acc, s) => acc + s.paidAmount, 0);

  // Faturação: pendentes e total emitido
  const pendingInvoicesCount = sales.filter(
    (s) => s.fiscalStatus === 'por_faturar' || s.fiscalStatus === 'pendente' || !s.documentId
  ).length;

  // Catálogo: produtos disponíveis e esgotados
  const activeProductsCount = products.filter((p) => p.available).length;
  const unavailableProductsCount = products.filter((p) => !p.available).length;

  // Papéis amigáveis
  const roleNameMap: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente Operacional',
    waiter: 'Empregado de Mesa',
    kitchen: 'Cozinheiro Chefe',
    bar: 'Equipa do Bar',
    cashier: 'Operador de Caixa',
  };

  // Definição dos Módulos Compactos
  interface ModuleCardConfig {
    id: ModuleType;
    subTab?: string;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    themeGradient: string;
    borderHover: string;
    textColor: string;
    indicators: {
      label: string;
      value: string | number;
      highlight?: 'normal' | 'warning' | 'alert' | 'success';
    }[];
    requiredRolesText: string;
  }

  const allModules: ModuleCardConfig[] = [
    // 1. Atendimento / Garçom
    {
      id: 'atendimento',
      title: 'Atendimento / Garçom',
      subtitle: 'Mesas, Comandas & Pedidos',
      description: 'Gestão de mesas, pedidos por lugar, envio de rondas e chamados.',
      icon: UtensilsCrossed,
      themeGradient: 'from-amber-500 to-orange-600',
      borderHover: 'hover:border-amber-500 hover:shadow-amber-950/40',
      textColor: 'group-hover:text-amber-400',
      indicators: [
        { label: 'Mesas', value: `${occupiedTablesCount}/${tables.length}` },
        { label: 'Comandas', value: openComandasCount },
        {
          label: 'Prontos',
          value: readyToDeliverCount,
          highlight: readyToDeliverCount > 0 ? 'success' : 'normal',
        },
        {
          label: 'Chamados',
          value: pendingCallsCount,
          highlight: pendingCallsCount > 0 ? 'alert' : 'normal',
        },
      ],
      requiredRolesText: 'Empregados de Mesa, Gerentes e Administradores',
    },

    // 2. Cozinha / Copa (KDS)
    {
      id: 'cozinha',
      title: 'Cozinha / Copa',
      subtitle: 'KDS de Preparação',
      description: 'Receção e preparação de pratos e pastelaria em tempo real.',
      icon: Flame,
      themeGradient: 'from-orange-500 to-rose-600',
      borderHover: 'hover:border-orange-500 hover:shadow-orange-950/40',
      textColor: 'group-hover:text-orange-400',
      indicators: [
        {
          label: 'No Fogo',
          value: kitchenPendingCount,
          highlight: kitchenPendingCount > 0 ? 'warning' : 'normal',
        },
        {
          label: 'Atrasados',
          value: kitchenDelayedCount,
          highlight: kitchenDelayedCount > 0 ? 'alert' : 'normal',
        },
        { label: 'Prazo', value: `${settings.expectedPrepTimeMinutes}m` },
      ],
      requiredRolesText: 'Chef, Cozinheiros, Gerentes e Administradores',
    },

    // 3. Bar & Bebidas (BDS)
    {
      id: 'bar',
      title: 'Bar & Bebidas',
      subtitle: 'BDS Bar Display System',
      description: 'Gestão de imperiais, cocktails, vinhos, cafetaria e avisos de entrega.',
      icon: Wine,
      themeGradient: 'from-cyan-500 to-blue-600',
      borderHover: 'hover:border-cyan-500 hover:shadow-cyan-950/40',
      textColor: 'group-hover:text-cyan-400',
      indicators: [
        {
          label: 'A Preparar',
          value: barPendingCount,
          highlight: barPendingCount > 0 ? 'warning' : 'normal',
        },
        {
          label: 'Prontas',
          value: barReadyCount,
          highlight: barReadyCount > 0 ? 'success' : 'normal',
        },
        { label: 'Tempo', value: '5m' },
      ],
      requiredRolesText: 'Barman, Equipa do Bar, Gerentes e Administradores',
    },

    // 4. Caixa / Vendas
    {
      id: 'admin',
      subTab: 'caixa',
      title: 'Caixa / Vendas',
      subtitle: 'Contas, Pagamentos & Fecho',
      description: 'Cobranças, divisões de conta, pagamentos mistos e fecho de turno.',
      icon: Wallet,
      themeGradient: 'from-emerald-500 to-teal-600',
      borderHover: 'hover:border-emerald-500 hover:shadow-emerald-950/40',
      textColor: 'group-hover:text-emerald-400',
      indicators: [
        {
          label: 'A Pagar',
          value: requestedBillsCount,
          highlight: requestedBillsCount > 0 ? 'alert' : 'normal',
        },
        {
          label: 'Sessão',
          value: activeCashSession ? 'Aberto' : 'Fechado',
          highlight: activeCashSession ? 'success' : 'normal',
        },
        { label: 'Cobrado', value: formatCurrency(totalReceivedToday) },
      ],
      requiredRolesText: 'Operadores de Caixa, Gerentes e Administradores',
    },

    // 5. Faturação / Emissão de Notas
    {
      id: 'faturacao',
      title: 'Faturação & Notas',
      subtitle: 'Software Certificado AT',
      description: 'Emissão de FS, FR, FT, RC, notas de crédito e envio E-mail/WhatsApp.',
      icon: FileCheck2,
      themeGradient: 'from-teal-500 to-emerald-700',
      borderHover: 'hover:border-teal-500 hover:shadow-teal-950/40',
      textColor: 'group-hover:text-teal-400',
      indicators: [
        {
          label: 'Pendentes',
          value: pendingInvoicesCount,
          highlight: pendingInvoicesCount > 0 ? 'warning' : 'normal',
        },
        { label: 'Emitidas', value: fiscalDocuments.length },
        { label: 'Série', value: '2026' },
      ],
      requiredRolesText: 'Operadores de Caixa, Gerentes e Administradores',
    },

    // 6. Cardápio & Catálogo
    {
      id: 'admin',
      subTab: 'cardapio',
      title: 'Cardápio & Catálogo',
      subtitle: 'Produtos & Disponibilidade',
      description: 'Gestão de pratos e bebidas, preços, alérgenos e stock esgotado.',
      icon: BookOpen,
      themeGradient: 'from-amber-600 to-yellow-600',
      borderHover: 'hover:border-yellow-500 hover:shadow-yellow-950/40',
      textColor: 'group-hover:text-yellow-400',
      indicators: [
        { label: 'Ativos', value: activeProductsCount },
        {
          label: 'Esgotados',
          value: unavailableProductsCount,
          highlight: unavailableProductsCount > 0 ? 'warning' : 'normal',
        },
        { label: 'Total', value: products.length },
      ],
      requiredRolesText: 'Gerentes, Administradores e Chef de Cozinha',
    },

    // 7. Admin / Gestão Geral
    {
      id: 'admin',
      subTab: 'dashboard',
      title: 'Admin / Gestão Geral',
      subtitle: 'Painel Geral & Controlo',
      description: 'Painel executivo, operadores, PINs, auditoria e relatórios de vendas.',
      icon: ShieldCheck,
      themeGradient: 'from-purple-500 to-indigo-700',
      borderHover: 'hover:border-purple-500 hover:shadow-purple-950/40',
      textColor: 'group-hover:text-purple-400',
      indicators: [
        { label: 'Operadores', value: users.filter((u) => u.active !== false).length },
        { label: 'Vendas', value: formatCurrency(sales.reduce((acc, s) => acc + s.total, 0)) },
        { label: 'Drive', value: settings.googleDriveSyncEnabled ? 'Ativo' : 'Manual' },
      ],
      requiredRolesText: 'Apenas Administradores e Gerentes',
    },
  ];

  // Regra Estrita: Para utilizadores não-admin, mostrar APENAS os módulos autorizados!
  const isExecutive = currentUser.role === 'admin' || currentUser.role === 'manager';

  const visibleModules = useMemo(() => {
    if (isExecutive && showAllModulesForAdmin) {
      return allModules;
    }
    return allModules.filter((mod) => store.canUserAccessModule(currentUser, mod.id));
  }, [currentUser, isExecutive, showAllModulesForAdmin, allModules]);

  const handleCardClick = (mod: ModuleCardConfig) => {
    const isAuthorized = store.canUserAccessModule(currentUser, mod.id);
    if (!isAuthorized) {
      setUnauthorizedAttemptModule({
        name: mod.title,
        required: mod.requiredRolesText,
      });
      return;
    }
    onSelectModule(mod.id, mod.subTab);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto py-1 sm:py-3 animate-in fade-in duration-300">
      {/* 1. Header Oficial do Portal Geral de Acesso (Compacto e Elegante) */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900/95 to-amber-950/30 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Identidade Oficial e Saudação com Nome do Utilizador */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 flex items-center justify-center shadow text-white font-black text-sm border border-amber-500/30">
                S&N
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Sabores & Nações
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                Portugal • AT
              </span>
              {!isOnline ? (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-mono">
                  <Wifi className="w-3 h-3" />
                  Sincronizado
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Portal Geral de Acesso
              </h1>
              <p className="text-xs sm:text-sm text-stone-300">
                Olá, <strong className="text-amber-400 font-extrabold">{currentUser.name}</strong>! Bem-vindo de volta ao centro de operações.
              </p>
            </div>
          </div>

          {/* Cartão de Operador e Ações Rápidas */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between md:justify-end">
            <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-inner">
              <span className="text-2xl">{currentUser.avatar}</span>
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-bold">Operador Ativo</div>
                <div className="font-extrabold text-white text-xs leading-none">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                  {roleNameMap[currentUser.role] || currentUser.role}
                </div>
              </div>

              <button
                onClick={onOpenOperatorModal}
                className="ml-1 p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg border border-stone-700 transition-all"
                title="Trocar utilizador ativo"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* Botão de Cenário de Teste Obrigatório */}
            <button
              onClick={onOpenScenarioModal}
              className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5 border border-emerald-400/30 shrink-0"
              title="Abrir o Cenário de Teste Obrigatório (14 Critérios)"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cenário Teste (14 Passos)</span>
              <span className="sm:hidden">Testes</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Barra de Contexto dos Módulos */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Grid3X3 className="w-4 h-4 text-amber-400" />
            <span>Módulos do Sistema</span>
          </h2>
          <span className="text-[11px] font-mono text-stone-400 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-800">
            {visibleModules.length} {visibleModules.length === 1 ? 'módulo disponível' : 'módulos disponíveis'}
          </span>
        </div>

        {!isExecutive && (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Apenas módulos autorizados para o seu perfil ({roleNameMap[currentUser.role]})
          </span>
        )}
      </div>

      {/* 3. Grelha Compacta e Responsiva de Cartões: até 4 colunas em desktops, 2 em tablets e 1-2 em telemóveis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
        {visibleModules.map((mod) => {
          const Icon = mod.icon;
          const isAuthorized = store.canUserAccessModule(currentUser, mod.id);

          return (
            <div
              key={`${mod.id}-${mod.subTab || 'root'}`}
              tabIndex={0}
              role="button"
              aria-label={`Aceder ao módulo ${mod.title}`}
              onClick={() => handleCardClick(mod)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(mod);
                }
              }}
              className={`bg-stone-900 border rounded-2xl p-3.5 sm:p-4 shadow-lg flex flex-col justify-between cursor-pointer transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-amber-500 h-full ${
                isAuthorized
                  ? `border-stone-800 ${mod.borderHover} hover:-translate-y-1 hover:shadow-xl`
                  : 'border-stone-850 opacity-60 bg-stone-950/40 hover:border-stone-700'
              }`}
            >
              {/* Parte Superior: Ícone Compacto + Título + Descrição Curta */}
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${mod.themeGradient} flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 inline-flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Autorizado
                  </span>
                </div>

                <div>
                  <h3
                    className={`text-sm sm:text-base font-extrabold text-white ${mod.textColor} transition-colors tracking-tight leading-snug`}
                  >
                    {mod.title}
                  </h3>
                  <div className="text-[11px] font-medium text-stone-400">
                    {mod.subtitle}
                  </div>
                  <p className="text-[11px] text-stone-400/90 leading-snug mt-1 line-clamp-2">
                    {mod.description}
                  </p>
                </div>

                {/* Indicadores em Formato Compacto (Pills) */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {mod.indicators.map((ind, idx) => {
                    let badgeStyle = 'bg-stone-950/90 text-stone-300 border-stone-800';
                    if (ind.highlight === 'alert') {
                      badgeStyle = 'bg-rose-950/70 text-rose-300 border-rose-800/80 animate-pulse';
                    } else if (ind.highlight === 'warning') {
                      badgeStyle = 'bg-amber-950/70 text-amber-300 border-amber-800/80';
                    } else if (ind.highlight === 'success') {
                      badgeStyle = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
                    }

                    return (
                      <div
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold flex items-center gap-1 ${badgeStyle}`}
                      >
                        <span className="text-[9px] text-stone-400 font-normal">{ind.label}:</span>
                        <strong className="font-mono">{ind.value}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé Compacto: Ação Imediata com Seta */}
              <div className="pt-2.5 mt-3 border-t border-stone-800/70 flex items-center justify-between text-xs">
                <span className="text-[10px] text-stone-400 truncate max-w-[140px]">
                  {mod.requiredRolesText.split(',')[0]}
                </span>

                <div className="font-extrabold flex items-center gap-1 text-xs text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Entrar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Acesso Não Autorizado */}
      {unauthorizedAttemptModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-rose-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 text-stone-100 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Acesso Não Autorizado</h3>
              <p className="text-xs text-stone-400">
                A sua conta ({currentUser.name} — <strong className="capitalize text-stone-200">{currentUser.role}</strong>) não tem permissões para aceder ao <strong>{unauthorizedAttemptModule.name}</strong>.
              </p>
            </div>

            <button
              onClick={() => setUnauthorizedAttemptModule(null)}
              className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
