/**
 * Sabores & Nações - Portal Geral de Acesso (Dashboard Central)
 * Ponto de entrada unificado para todos os módulos da plataforma:
 * Atendimento, Cozinha/Copa, Bar, Caixa, Faturação, Cardápio/Catálogo e Administração Geral
 */

import React, { useState } from 'react';
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
  Globe,
  DollarSign,
  AlertTriangle,
  Layers,
  ChevronRight,
  Boxes,
  Settings,
  HelpCircle,
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

  // Pedidos do Site
  const pendingOnlineOrdersCount = onlineOrders.filter((o) => o.prepStatus !== 'entregue').length;

  // Papéis amigáveis
  const roleNameMap: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente Operacional',
    waiter: 'Empregado de Mesa',
    kitchen: 'Cozinheiro Chefe',
    bar: 'Equipa do Bar',
    cashier: 'Operador de Caixa',
  };

  // Configuração dos 7 Módulos Oficiais da Sabores & Nações
  interface ModuleCardConfig {
    id: ModuleType;
    subTab?: string;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    themeGradient: string;
    borderHover: string;
    badgeHover: string;
    indicators: {
      label: string;
      value: string | number;
      highlight?: 'normal' | 'warning' | 'alert' | 'success';
    }[];
    requiredRolesText: string;
  }

  const modules: ModuleCardConfig[] = [
    // 1. Atendimento / Garçom
    {
      id: 'atendimento',
      title: 'Atendimento / Garçom',
      subtitle: 'Mesas, Comandas & Pedidos',
      description:
        'Abertura de mesas, atribuição por lugar individual, envio de rondas à cozinha/bar, chamados de mesa e acompanhamento.',
      icon: UtensilsCrossed,
      themeGradient: 'from-amber-600 to-orange-700',
      borderHover: 'hover:border-amber-500 hover:shadow-amber-950/40',
      badgeHover: 'group-hover:text-amber-400',
      indicators: [
        { label: 'Mesas Ocupadas', value: `${occupiedTablesCount} / ${tables.length}`, highlight: 'normal' },
        { label: 'Comandas Abertas', value: openComandasCount, highlight: 'normal' },
        {
          label: 'Prontos a Entregar',
          value: readyToDeliverCount,
          highlight: readyToDeliverCount > 0 ? 'success' : 'normal',
        },
        {
          label: 'Chamados QR',
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
      subtitle: 'KDS Kitchen Display System',
      description:
        'Receção em tempo real de pratos e pastelaria, cronómetros de preparação, aviso sonoro de pedidos e confirmação de itens prontos.',
      icon: Flame,
      themeGradient: 'from-orange-600 to-rose-700',
      borderHover: 'hover:border-orange-500 hover:shadow-orange-950/40',
      badgeHover: 'group-hover:text-orange-400',
      indicators: [
        {
          label: 'Pratos no Fogo',
          value: kitchenPendingCount,
          highlight: kitchenPendingCount > 0 ? 'warning' : 'normal',
        },
        {
          label: 'Pedidos Atrasados',
          value: kitchenDelayedCount,
          highlight: kitchenDelayedCount > 0 ? 'alert' : 'normal',
        },
        {
          label: 'Prazo Estimado',
          value: `${settings.expectedPrepTimeMinutes} min`,
          highlight: 'normal',
        },
      ],
      requiredRolesText: 'Chef & Cozinheiros, Gerentes e Administradores',
    },

    // 3. Bar & Bebidas (BDS)
    {
      id: 'bar',
      title: 'Bar & Bebidas',
      subtitle: 'BDS Bar Display System',
      description:
        'Gestão de imperiais, cocktails, vinhos e cafetaria, observações especiais de serviço e aviso imediato ao empregado.',
      icon: Wine,
      themeGradient: 'from-cyan-600 to-blue-700',
      borderHover: 'hover:border-cyan-500 hover:shadow-cyan-950/40',
      badgeHover: 'group-hover:text-cyan-400',
      indicators: [
        {
          label: 'Bebidas a Preparar',
          value: barPendingCount,
          highlight: barPendingCount > 0 ? 'warning' : 'normal',
        },
        {
          label: 'Prontas no Balcão',
          value: barReadyCount,
          highlight: barReadyCount > 0 ? 'success' : 'normal',
        },
        { label: 'Tempo Padrão', value: '5 min', highlight: 'normal' },
      ],
      requiredRolesText: 'Barman & Equipa do Bar, Gerentes e Administradores',
    },

    // 4. Caixa / Vendas
    {
      id: 'admin',
      subTab: 'caixa',
      title: 'Caixa / Vendas',
      subtitle: 'Contas, Pagamentos & Fecho de Turno',
      description:
        'Divisão de contas por pessoa, pagamentos mistos (Multibanco, Numerário, MB WAY), sangrias, suprimentos e fecho de caixa cego.',
      icon: Wallet,
      themeGradient: 'from-emerald-600 to-teal-700',
      borderHover: 'hover:border-emerald-500 hover:shadow-emerald-950/40',
      badgeHover: 'group-hover:text-emerald-400',
      indicators: [
        {
          label: 'Contas Solicitadas',
          value: requestedBillsCount,
          highlight: requestedBillsCount > 0 ? 'alert' : 'normal',
        },
        {
          label: 'Sessão de Caixa',
          value: activeCashSession ? 'Aberto' : 'Fechado',
          highlight: activeCashSession ? 'success' : 'normal',
        },
        {
          label: 'Cobranças Hoje',
          value: formatCurrency(totalReceivedToday),
          highlight: 'normal',
        },
      ],
      requiredRolesText: 'Operadores de Caixa, Gerentes e Administradores',
    },

    // 5. Faturação / Emissão de Notas
    {
      id: 'faturacao',
      title: 'Faturação & Notas',
      subtitle: 'Software Certificado AT & Vendus API',
      description:
        'Emissão e reenvio de faturas (FS, FR, FT, RC), notas de crédito, faturas avulsas, envio por E-mail/WhatsApp e relatórios fiscais.',
      icon: FileCheck2,
      themeGradient: 'from-teal-600 to-emerald-800',
      borderHover: 'hover:border-teal-500 hover:shadow-teal-950/40',
      badgeHover: 'group-hover:text-teal-400',
      indicators: [
        {
          label: 'Pendentes de Faturação',
          value: pendingInvoicesCount,
          highlight: pendingInvoicesCount > 0 ? 'warning' : 'normal',
        },
        {
          label: 'Documentos Emitidos',
          value: fiscalDocuments.length,
          highlight: 'normal',
        },
        { label: 'Série Ativa', value: '2026 (AT)', highlight: 'normal' },
      ],
      requiredRolesText: 'Operadores de Caixa, Gerentes e Administradores',
    },

    // 6. Cardápio & Catálogo de Produtos
    {
      id: 'admin',
      subTab: 'cardapio',
      title: 'Cardápio & Catálogo',
      subtitle: 'Produtos, Preços & Disponibilidade',
      description:
        'Gestão de pratos e bebidas, preços, variantes (copo/garrafa, tamanho), alérgenos, adicionais e comunicação de esgotamento.',
      icon: BookOpen,
      themeGradient: 'from-amber-700 to-yellow-600',
      borderHover: 'hover:border-yellow-500 hover:shadow-yellow-950/40',
      badgeHover: 'group-hover:text-yellow-400',
      indicators: [
        { label: 'Produtos Ativos', value: activeProductsCount, highlight: 'normal' },
        {
          label: 'Itens Esgotados',
          value: unavailableProductsCount,
          highlight: unavailableProductsCount > 0 ? 'warning' : 'normal',
        },
        { label: 'Total no Menu', value: products.length, highlight: 'normal' },
      ],
      requiredRolesText: 'Gerentes, Administradores e Chef de Cozinha',
    },

    // 7. Admin / Gestão Geral
    {
      id: 'admin',
      subTab: 'dashboard',
      title: 'Admin / Gestão Geral',
      subtitle: 'Configurações, Utilizadores & Relatórios',
      description:
        'Painel executivo, gestão de operadores e PINs, auditoria completa, mesas, relatórios analíticos de vendas e definições fiscais.',
      icon: ShieldCheck,
      themeGradient: 'from-purple-600 to-indigo-800',
      borderHover: 'hover:border-purple-500 hover:shadow-purple-950/40',
      badgeHover: 'group-hover:text-purple-400',
      indicators: [
        { label: 'Utilizadores Ativos', value: users.filter((u) => u.active !== false).length, highlight: 'normal' },
        { label: 'Pedidos do Site', value: pendingOnlineOrdersCount, highlight: 'normal' },
        {
          label: 'Backup Drive',
          value: settings.googleDriveSyncEnabled ? 'Ativo' : 'Manual',
          highlight: 'normal',
        },
      ],
      requiredRolesText: 'Apenas Administradores e Gerentes',
    },
  ];

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
    <div className="space-y-6 max-w-7xl mx-auto py-2 sm:py-6 animate-in fade-in duration-300">
      {/* 1. Header do Portal com Saudação e Identidade Oficial */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900/95 to-stone-950 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            {/* Tag e Status de Conexão */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Plataforma Sabores & Nações
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                Portugal • Conforme AT
              </span>
              {!isOnline ? (
                <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
                  <WifiOff className="w-3 h-3" />
                  Modo Offline
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-mono">
                  <Wifi className="w-3 h-3" />
                  Sincronizado
                </span>
              )}
            </div>

            {/* Título Principal e Saudação */}
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Portal Geral de Acesso
              </h1>
              <p className="text-sm sm:text-base text-stone-300 font-medium mt-1">
                Olá, <strong className="text-amber-400">{currentUser.name}</strong>! Bem-vindo de volta ao centro de operações.
              </p>
              <p className="text-xs text-stone-400 max-w-2xl leading-relaxed mt-1">
                Aceda diretamente aos módulos operacionais do restaurante. Todas as transações, pedidos e documentos partilham a mesma base de dados em tempo real.
              </p>
            </div>
          </div>

          {/* Cartão do Utilizador Ativo & Botão Alternar Operador */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between sm:justify-start gap-4 shadow-inner shrink-0">
            <div className="flex items-center gap-3.5">
              <span className="text-4xl p-2 bg-stone-900 rounded-2xl border border-stone-800 shadow">
                {currentUser.avatar}
              </span>
              <div>
                <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                  Sessão Iniciada
                </div>
                <div className="font-black text-white text-base leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-xs text-amber-400 font-bold mt-0.5">
                  {roleNameMap[currentUser.role] || currentUser.role}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenOperatorModal}
              className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-all active:scale-95 flex items-center gap-1.5 shadow"
              title="Trocar operador ativo no dispositivo"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Trocar</span>
            </button>
          </div>
        </div>

        {/* Barra de Acesso Rápido ao Cenário de Validação Obrigatório */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Cenário Obrigatório de Teste (14 Critérios):</strong> fluxo completo de abertura de mesa, cozinha, bar, faturação AT e partilha.
            </span>
          </div>

          <button
            onClick={onOpenScenarioModal}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-emerald-400/30 shrink-0"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Executar Teste de Fluxo</span>
          </button>
        </div>
      </div>

      {/* 2. Grelha de Cartões dos Módulos com Acesso Direto */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-amber-400" />
              <span>Módulos do Restaurante</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Selecione o cartão desejado para entrar diretamente na área de trabalho.
            </p>
          </div>
          <span className="text-xs text-stone-400 font-mono hidden sm:inline">
            7 Módulos Disponíveis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => {
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
                className={`bg-stone-900 border rounded-3xl p-6 shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isAuthorized
                    ? `border-stone-800 ${mod.borderHover} hover:-translate-y-1.5 hover:shadow-2xl`
                    : 'border-stone-850 opacity-60 bg-stone-950/40 hover:border-stone-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Top do Cartão: Ícone Temático e Badge de Autorização */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.themeGradient} flex items-center justify-center text-white shadow-lg shadow-stone-950/60 group-hover:scale-105 transition-transform shrink-0`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>

                    <div className="text-right">
                      {isAuthorized ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-700/60 inline-flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          Autorizado
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 inline-flex items-center gap-1 font-mono">
                          <Lock className="w-3 h-3" />
                          Restrito
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nome e Descrição */}
                  <div>
                    <h3
                      className={`text-lg font-black text-white ${mod.badgeHover} transition-colors tracking-tight`}
                    >
                      {mod.title}
                    </h3>
                    <div className="text-xs font-semibold text-stone-400 mt-0.5">
                      {mod.subtitle}
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed mt-2.5 line-clamp-3">
                      {mod.description}
                    </p>
                  </div>

                  {/* Indicadores Dinâmicos em Tempo Real */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {mod.indicators.map((ind, idx) => {
                      let badgeStyle = 'bg-stone-950/80 text-stone-300 border-stone-800';
                      if (ind.highlight === 'alert') {
                        badgeStyle = 'bg-rose-950/60 text-rose-300 border-rose-800/80 animate-pulse';
                      } else if (ind.highlight === 'warning') {
                        badgeStyle = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
                      } else if (ind.highlight === 'success') {
                        badgeStyle = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
                      }

                      return (
                        <div
                          key={idx}
                          className={`text-[11px] px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 shadow-sm ${badgeStyle}`}
                        >
                          <span className="text-[10px] text-stone-400 font-normal">{ind.label}:</span>
                          <strong className="font-mono">{ind.value}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rodapé do Cartão com Ação Clara */}
                <div className="pt-4 mt-5 border-t border-stone-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-500 font-medium truncate max-w-[170px]">
                    {mod.requiredRolesText}
                  </span>

                  <div
                    className={`font-black flex items-center gap-1.5 text-xs ${
                      isAuthorized
                        ? 'text-amber-400 group-hover:translate-x-1 transition-transform'
                        : 'text-stone-500'
                    }`}
                  >
                    <span>{isAuthorized ? 'Entrar no Módulo' : 'Requer Permissão'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Acesso Não Autorizado / Bloqueio de Segurança */}
      {unauthorizedAttemptModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-rose-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-stone-100 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Acesso Não Autorizado</h3>
              <p className="text-xs text-stone-400">
                A sua conta atual (<strong>{currentUser.name}</strong> —{' '}
                <span className="capitalize font-bold text-stone-300">
                  {roleNameMap[currentUser.role] || currentUser.role}
                </span>
                ) não possui credenciais para aceder ao <strong>{unauthorizedAttemptModule.name}</strong>.
              </p>
            </div>

            <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <div>• {unauthorizedAttemptModule.required}.</div>
              <div>• Caso necessite de acesso, solicite a autorização ao Administrador ou Gerente.</div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setUnauthorizedAttemptModule(null)}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  setUnauthorizedAttemptModule(null);
                  onSelectModule(store.getDefaultModuleForUser(currentUser));
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                Ir p/ Meu Módulo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
