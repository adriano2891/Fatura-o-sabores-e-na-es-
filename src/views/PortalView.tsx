import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Flame,
  Wine,
  Shield,
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
  FileCheck2,
  Wallet,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { ModuleType, User } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PortalViewProps {
  state: AppState;
  onSelectModule: (module: ModuleType) => void;
  onOpenOperatorModal: () => void;
  onOpenScenarioModal: () => void;
}

export const PortalView: React.FC<PortalViewProps> = ({
  state,
  onSelectModule,
  onOpenOperatorModal,
  onOpenScenarioModal,
}) => {
  const { currentUser, tables, comandas, products, sales, cashSessions, isOnline, settings } = state;

  const [unauthorizedAttemptModule, setUnauthorizedAttemptModule] = useState<ModuleType | null>(null);

  // Métricas em tempo real para os cartões
  const occupiedTablesCount = tables.filter((t) => t.status === 'ocupada' || t.status === 'conta_solicitada').length;
  const pendingCallsCount = tables.filter((t) => !!t.activeCall).length;

  const readyToDeliverCount = comandas.reduce(
    (acc, c) => acc + c.rounds.reduce((rAcc, r) => rAcc + r.items.filter((i) => i.status === 'pronto').length, 0),
    0
  );

  const kitchenPendingCount = comandas.reduce(
    (acc, c) =>
      acc +
      c.rounds.reduce(
        (rAcc, r) =>
          rAcc +
          r.items.filter(
            (i) => (i.sector === 'cozinha' || i.sector === 'pastelaria') && (i.status === 'recebido' || i.status === 'em_preparacao')
          ).length,
        0
      ),
    0
  );

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

  const totalSalesToday = sales
    .filter((s) => s.status === 'paga' || s.paidAmount > 0)
    .reduce((acc, s) => acc + s.paidAmount, 0);

  const openComandasCount = comandas.filter((c) => c.status === 'aberta' || c.status === 'conta_solicitada').length;

  const modulesConfig: {
    id: ModuleType;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    themeColor: string;
    borderHighlight: string;
    badges: { label: string; value: string | number; color: string }[];
    requiredRolesText: string;
  }[] = [
    {
      id: 'atendimento',
      title: 'Módulo Atendimento',
      subtitle: 'Comanda Móvel & Gestão de Mesas',
      description: 'Interface rápida para empregados de mesa: abertura de mesas, lugares individuais, envio de rondas, alergias e entrega.',
      icon: UtensilsCrossed,
      themeColor: 'from-amber-600 to-orange-700',
      borderHighlight: 'hover:border-amber-500 hover:shadow-amber-950/30',
      badges: [
        { label: 'Mesas Ocupadas', value: occupiedTablesCount, color: 'text-amber-400 bg-amber-950/60' },
        { label: 'Prontos a Entregar', value: readyToDeliverCount, color: readyToDeliverCount > 0 ? 'text-emerald-400 bg-emerald-950/80 animate-pulse' : 'text-stone-400 bg-stone-900' },
        { label: 'Chamados QR', value: pendingCallsCount, color: pendingCallsCount > 0 ? 'text-rose-400 bg-rose-950/80 animate-bounce' : 'text-stone-400 bg-stone-900' },
      ],
      requiredRolesText: 'Empregados de Mesa, Gerentes e Administradores',
    },
    {
      id: 'cozinha',
      title: 'Módulo Cozinha / Copa',
      subtitle: 'KDS de Preparação de Pratos',
      description: 'Painel exclusivo da cozinha: tickets de pedidos por ronda e lugar, cronómetros de preparação, aviso de alérgenos e pratos prontos.',
      icon: Flame,
      themeColor: 'from-orange-600 to-rose-700',
      borderHighlight: 'hover:border-orange-500 hover:shadow-orange-950/30',
      badges: [
        { label: 'Pratos no Fogo', value: kitchenPendingCount, color: kitchenPendingCount > 0 ? 'text-orange-400 bg-orange-950/80 animate-pulse' : 'text-stone-400 bg-stone-900' },
        { label: 'Tolerância Atraso', value: `${settings.expectedPrepTimeMinutes + settings.delayToleranceMinutes} min`, color: 'text-stone-300 bg-stone-900' },
      ],
      requiredRolesText: 'Chef & Cozinheiros, Gerentes e Administradores',
    },
    {
      id: 'bar',
      title: 'Módulo Bar & Bebidas',
      subtitle: 'BDS de Bebidas, Vinhos & Cafetaria',
      description: 'Painel exclusivo do bar: preparação rápida de bebidas, notas especiais (sem gelo, com limão), coquetéis e aviso de levantamento.',
      icon: Wine,
      themeColor: 'from-cyan-600 to-blue-700',
      borderHighlight: 'hover:border-cyan-500 hover:shadow-cyan-950/30',
      badges: [
        { label: 'Bebidas a Preparar', value: barPendingCount, color: barPendingCount > 0 ? 'text-cyan-400 bg-cyan-950/80 animate-pulse' : 'text-stone-400 bg-stone-900' },
        { label: 'Tempo Padrão', value: `${settings.sectorPrepTimes?.bar || 5} min`, color: 'text-stone-300 bg-stone-900' },
      ],
      requiredRolesText: 'Barman & Equipa do Bar, Gerentes e Administradores',
    },
    {
      id: 'admin',
      title: 'Módulo Administração',
      subtitle: 'Gestão, Faturação Certificada & Caixa',
      description: 'Controle global: Dashboard financeiro, emissão de faturas (Vendus/AT), pagamentos mistos, utilizadores, stock e definições.',
      icon: ShieldCheck,
      themeColor: 'from-purple-600 to-indigo-800',
      borderHighlight: 'hover:border-purple-500 hover:shadow-purple-950/30',
      badges: [
        { label: 'Vendas Hoje', value: formatCurrency(totalSalesToday), color: 'text-emerald-400 bg-emerald-950/80 font-mono' },
        { label: 'Comandas Abertas', value: openComandasCount, color: 'text-amber-400 bg-amber-950/60' },
        { label: 'Faturação Vendus', value: 'Conectada (AT)', color: 'text-cyan-300 bg-cyan-950/60' },
      ],
      requiredRolesText: 'Administradores, Gerentes e Operadores de Caixa',
    },
  ];

  const handleCardClick = (module: ModuleType) => {
    const isAuthorized = store.canUserAccessModule(currentUser, module);
    if (!isAuthorized) {
      setUnauthorizedAttemptModule(module);
      return;
    }
    onSelectModule(module);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 sm:py-6 animate-in fade-in duration-300">
      {/* Top Banner de Identidade e Sessão */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900/90 to-stone-950 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Sistema Multi-Módulo Independente
              </span>
              {!isOnline && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sabores & Nações — Portal de Operações
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
              Plataforma integrada de ponto de venda, cozinha, bar e faturação certificada. Todos os módulos partilham a mesma base de dados em tempo real com permissões rigorosas por função.
            </p>
          </div>

          {/* Cartão do Utilizador Ativo & Botão Alternar Operador */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex items-center justify-between sm:justify-start gap-4 shadow-inner">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-1.5 bg-stone-900 rounded-xl border border-stone-800">
                {currentUser.avatar}
              </span>
              <div>
                <div className="text-[10px] text-stone-400 uppercase font-semibold">Sessão Iniciada</div>
                <div className="font-extrabold text-white text-sm">{currentUser.name}</div>
                <div className="text-xs text-amber-400 font-bold capitalize">
                  {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'waiter' ? 'Empregado de Mesa' : currentUser.role === 'kitchen' ? 'Cozinha / Copa' : currentUser.role === 'bar' ? 'Equipa do Bar' : currentUser.role}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenOperatorModal}
              className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-all active:scale-95 flex items-center gap-1.5"
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
              <strong>Cenário Obrigatório de Teste (14 Critérios):</strong> fluxo completo de mesa, cozinha, bar, faturação AT e partilha.
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

      {/* Grelha dos 4 Módulos Independentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white">Módulos da Plataforma</h2>
          <span className="text-xs text-stone-400">
            Selecione o módulo pretendido conforme as suas credenciais
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {modulesConfig.map((mod) => {
            const Icon = mod.icon;
            const isAuthorized = store.canUserAccessModule(currentUser, mod.id);

            return (
              <div
                key={mod.id}
                onClick={() => handleCardClick(mod.id)}
                className={`bg-stone-900 border rounded-3xl p-6 shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-300 group ${
                  isAuthorized
                    ? `border-stone-800 ${mod.borderHighlight} hover:-translate-y-1`
                    : 'border-stone-850 opacity-60 bg-stone-950/40'
                }`}
              >
                <div className="space-y-4">
                  {/* Top do Cartão com Ícone e Estado de Acesso */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.themeColor} flex items-center justify-center text-white shadow-lg shadow-stone-950/50 group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>

                    <div className="text-right">
                      {isAuthorized ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Autorizado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Acesso Restrito
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Títulos e Descrição */}
                  <div>
                    <h3 className="text-lg font-extrabold text-white group-hover:text-amber-400 transition-colors">
                      {mod.title}
                    </h3>
                    <div className="text-xs font-semibold text-stone-400 mt-0.5">{mod.subtitle}</div>
                    <p className="text-xs text-stone-400/90 leading-relaxed mt-2">{mod.description}</p>
                  </div>

                  {/* Indicadores em Tempo Real */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {mod.badges.map((b, idx) => (
                      <div
                        key={idx}
                        className={`text-[11px] px-2.5 py-1 rounded-xl border border-stone-800/80 font-semibold flex items-center gap-1.5 ${b.color}`}
                      >
                        <span className="text-[10px] text-stone-400">{b.label}:</span>
                        <strong>{b.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rodapé do Cartão */}
                <div className="pt-5 mt-5 border-t border-stone-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-500 font-medium truncate max-w-[200px]">
                    {mod.requiredRolesText}
                  </span>

                  <div
                    className={`font-bold flex items-center gap-1.5 ${
                      isAuthorized
                        ? 'text-amber-400 group-hover:translate-x-1 transition-transform'
                        : 'text-stone-500'
                    }`}
                  >
                    <span>{isAuthorized ? 'Aceder ao Módulo' : 'Requer Permissão'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-rose-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-stone-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Acesso Não Autorizado</h3>
              <p className="text-xs text-stone-400">
                A sua conta individual ({currentUser.name} —{' '}
                <strong className="text-stone-200 capitalize">{currentUser.role}</strong>) não possui permissões
                para aceder ao <strong>Módulo {unauthorizedAttemptModule.toUpperCase()}</strong>.
              </p>
            </div>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <div>• Cada funcionário acede estritamente às ferramentas da sua função.</div>
              <div>• Apenas o Administrador pode conceder autorizações a outros módulos.</div>
            </div>

            <div className="flex gap-2 pt-2">
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
