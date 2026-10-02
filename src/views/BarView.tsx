/**
 * Sabores & Nações - BDS Bar & Bebidas (Bar Display System)
 * Ecrã de Alta Visibilidade e Gestão em Tempo Real de Bebidas, Cocktails, Cafés e Vinhos
 * Totalmente integrado com Atendimento, Cozinha, Caixa, Admin e Pedidos Online
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Wine,
  Clock,
  CheckCircle2,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Globe,
  Bell,
  Search,
  X,
  ShieldAlert,
  ShieldCheck,
  Ban,
  GlassWater,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  History,
  Coffee,
  Beer,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { OrderItem, ItemPrepStatus, Product } from '../types';
import { formatTime, formatElapsed, getElapsedMinutes, playAlertSound } from '../utils/formatters';

interface BarViewProps {
  state: AppState;
  onSelectTab?: (tab: any) => void;
}

export type BarStatusFilter = 'todos' | 'novos' | 'em_preparacao' | 'pronto' | 'historico' | 'cancelados';
export type BarOriginFilter = 'todas' | 'sala' | 'esplanada' | 'site';

export interface BarTicket {
  id: string;
  isOnline: boolean;
  comandaId?: string;
  comandaNumber: string;
  tableName: string;
  roomName: string;
  roundNumber: number;
  roundCreatedAt: string;
  waiterName: string;
  guestCount?: number;
  items: OrderItem[];
  allRoundItemsCount: number;
  barAlertedAt?: string;
  barAcknowledgedAt?: string;
  barAcknowledgedBy?: string;
  allergies: string[];
  cancelledItems: OrderItem[];
  hasDeliveredAll: boolean;
  overallStatus: 'novos' | 'em_preparacao' | 'pronto' | 'historico' | 'cancelados' | 'parcial';
}

export const BarView: React.FC<BarViewProps> = ({ state }) => {
  const { comandas, onlineOrders, currentUser, settings, products } = state;

  // Filtros de visualização
  const [statusFilter, setStatusFilter] = useState<BarStatusFilter>('todos');
  const [originFilter, setOriginFilter] = useState<BarOriginFilter>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais e Configurações de Ecrã
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [justNotifiedTicketId, setJustNotifiedTicketId] = useState<string | null>(null);

  // Confirmações de Leitura na Sessão
  const [acknowledgedAllergies, setAcknowledgedAllergies] = useState<Record<string, boolean>>({});
  const [acknowledgedCancellations, setAcknowledgedCancellations] = useState<Record<string, boolean>>({});

  // Proteção contra múltiplos cliques
  const [isProcessing, setIsProcessing] = useState(false);

  // Monitor de novos pedidos de bebidas para sinal sonoro
  const prevActiveCountRef = useRef<number>(0);

  // Alternar modo ecrã inteiro no balcão
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // 1. Construir Bilhetes das Mesas do Restaurante (Apenas setor 'bar')
  const tickets: BarTicket[] = [];

  for (const comanda of comandas) {
    if (comanda.status === 'cancelada') continue;

    for (const round of comanda.rounds) {
      // Filtrar estritamente apenas os produtos destinados ao Bar
      const barItems = round.items.filter((item) => item.sector === 'bar');
      if (barItems.length === 0) continue;

      const activeItems = barItems.filter((i) => i.status !== 'cancelado');
      const cancelledItems = barItems.filter((i) => i.status === 'cancelado');

      // Extrair alergias relevantes de bebidas (ex: sulfitos, frutos secos em licores, etc.)
      const allergiesSet = new Set<string>();
      barItems.forEach((item) => {
        if (item.allergyWarnings && item.allergyWarnings.length > 0) {
          item.allergyWarnings.forEach((a) => allergiesSet.add(a));
        }
      });

      if (comanda.seats) {
        barItems.forEach((item) => {
          if (item.seatNumber) {
            const seat = comanda.seats.find((s) => s.seatNumber === item.seatNumber);
            if (seat && seat.allergies.length > 0) {
              seat.allergies.forEach((a) => allergiesSet.add(`${a.name} (Lugar ${seat.seatNumber})`));
            }
          }
        });
      }

      // Determinar Estado Geral do Bilhete
      const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'pronto');
      const allDelivered = activeItems.length > 0 && activeItems.every((i) => i.status === 'entregue');
      const allReceived = activeItems.length > 0 && activeItems.every((i) => i.status === 'recebido');
      const hasPrepping = activeItems.some((i) => i.status === 'em_preparacao');
      const hasReady = activeItems.some((i) => i.status === 'pronto');
      const allCancelled = activeItems.length === 0 && cancelledItems.length > 0;

      let overallStatus: BarTicket['overallStatus'] = 'novos';
      if (allCancelled) {
        overallStatus = 'cancelados';
      } else if (allDelivered) {
        overallStatus = 'historico';
      } else if (allReady) {
        overallStatus = 'pronto';
      } else if (hasReady && (hasPrepping || allReceived)) {
        overallStatus = 'parcial';
      } else if (hasPrepping) {
        overallStatus = 'em_preparacao';
      } else {
        overallStatus = 'novos';
      }

      tickets.push({
        id: `${comanda.id}-r${round.roundNumber}`,
        isOnline: false,
        comandaId: comanda.id,
        comandaNumber: comanda.numberDisplay,
        tableName: comanda.tableName,
        roomName: comanda.roomName,
        roundNumber: round.roundNumber,
        roundCreatedAt: round.createdAt,
        waiterName: round.waiterName || comanda.waiterName,
        guestCount: comanda.guestCount,
        items: barItems,
        allRoundItemsCount: round.items.length,
        barAlertedAt: round.kitchenAlertedAt,
        barAcknowledgedAt: round.kitchenAcknowledgedAt,
        barAcknowledgedBy: round.kitchenAcknowledgedBy,
        allergies: Array.from(allergiesSet),
        cancelledItems,
        hasDeliveredAll: allDelivered,
        overallStatus,
      });
    }
  }

  // 2. Pedidos Online do Site (Apenas bebidas)
  for (const order of onlineOrders) {
    const barItems = order.items.filter((item) => item.sector === 'bar');
    if (barItems.length === 0) continue;

    const allDelivered = order.prepStatus === 'entregue';
    const allReady = order.prepStatus === 'pronto';
    const isPrepping = order.prepStatus === 'em_preparacao';

    let overallStatus: BarTicket['overallStatus'] = 'novos';
    if (allDelivered) {
      overallStatus = 'historico';
    } else if (allReady) {
      overallStatus = 'pronto';
    } else if (isPrepping) {
      overallStatus = 'em_preparacao';
    } else {
      overallStatus = 'novos';
    }

    tickets.push({
      id: order.id,
      isOnline: true,
      comandaNumber: order.id,
      tableName: `Site: ${order.customerName}`,
      roomName: order.deliveryType === 'entrega' ? 'Entrega Web' : 'Takeaway / Levantamento',
      roundNumber: 1,
      roundCreatedAt: order.createdAt,
      waiterName: 'Pedido Online',
      items: barItems,
      allRoundItemsCount: order.items.length,
      allergies: [],
      cancelledItems: [],
      hasDeliveredAll: allDelivered,
      overallStatus,
    });
  }

  // Ordenar por hora de envio (os mais antigos primeiro)
  tickets.sort(
    (a, b) => new Date(a.roundCreatedAt).getTime() - new Date(b.roundCreatedAt).getTime()
  );

  // Alerta sonoro quando chegam novos pedidos de bebidas
  const activeTicketsCount = tickets.filter((t) => t.overallStatus !== 'historico').length;
  useEffect(() => {
    if (prevActiveCountRef.current > 0 && activeTicketsCount > prevActiveCountRef.current && soundEnabled) {
      playAlertSound('order');
    }
    prevActiveCountRef.current = activeTicketsCount;
  }, [activeTicketsCount, soundEnabled]);

  // Filtragem dos Bilhetes
  const filteredTickets = tickets.filter((t) => {
    // Filtro por Estado
    if (statusFilter === 'novos') {
      if (t.overallStatus !== 'novos') return false;
    } else if (statusFilter === 'em_preparacao') {
      if (t.overallStatus !== 'em_preparacao' && t.overallStatus !== 'parcial') return false;
    } else if (statusFilter === 'pronto') {
      if (t.overallStatus !== 'pronto') return false;
    } else if (statusFilter === 'historico') {
      if (t.overallStatus !== 'historico') return false;
    } else if (statusFilter === 'cancelados') {
      if (t.cancelledItems.length === 0) return false;
    } else if (statusFilter === 'todos') {
      // Exclui entregues por padrão na fila ativa
      if (t.overallStatus === 'historico') return false;
    }

    // Filtro por Origem
    if (originFilter === 'site' && !t.isOnline) return false;
    if (originFilter === 'sala' && (t.isOnline || !t.roomName.toLowerCase().includes('principal'))) return false;
    if (originFilter === 'esplanada' && (t.isOnline || !t.roomName.toLowerCase().includes('esplanada'))) return false;

    // Filtro de Pesquisa
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.tableName.toLowerCase().includes(q) ||
        t.comandaNumber.toLowerCase().includes(q) ||
        t.waiterName.toLowerCase().includes(q) ||
        t.items.some((i) => i.productName.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Ações de Estado de Preparação
  const handleUpdateItemStatus = (itemId: string, nextStatus: ItemPrepStatus) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      store.updateItemPrepStatus(itemId, nextStatus, currentUser);
      if (nextStatus === 'pronto' && soundEnabled) {
        playAlertSound('ready');
      }
    } finally {
      setTimeout(() => setIsProcessing(false), 200);
    }
  };

  const handleStartAllItems = (ticket: BarTicket) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      ticket.items.forEach((it) => {
        if (it.status === 'recebido') {
          store.updateItemPrepStatus(it.id, 'em_preparacao', currentUser);
        }
      });
    } finally {
      setTimeout(() => setIsProcessing(false), 300);
    }
  };

  const handleMarkTicketAllReady = (ticket: BarTicket) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (ticket.isOnline) {
        store.markOnlineOrderSectorReady(ticket.id, 'bar', currentUser);
      } else if (ticket.comandaId) {
        store.markRoundSectorReady(ticket.comandaId, ticket.roundNumber, 'bar', currentUser);
      }

      setJustNotifiedTicketId(ticket.id);
      if (soundEnabled) {
        playAlertSound('ready');
      }

      if (ticket.comandaId) {
        store.addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'BEBIDAS_PRONTAS_BAR',
          module: 'bar',
          details: `Bebidas da ${ticket.tableName} (Ronda #${ticket.roundNumber}) prontas para entrega. Empregado notificado.`,
          targetId: ticket.comandaId,
        });
      }

      setTimeout(() => {
        setJustNotifiedTicketId(null);
      }, 4000);
    } finally {
      setTimeout(() => setIsProcessing(false), 300);
    }
  };

  const handleAcknowledgeAlert = (ticket: BarTicket) => {
    if (ticket.comandaId) {
      store.acknowledgeKitchenAlert(ticket.comandaId, ticket.roundNumber, currentUser);
    }
  };

  const handleAcknowledgeAllergies = (ticketId: string) => {
    setAcknowledgedAllergies((prev) => ({ ...prev, [ticketId]: true }));
    store.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'ALERGIA_CONFIRMADA_BAR',
      module: 'bar',
      details: `Equipa do Bar confirmou leitura de alergia no bilhete ${ticketId}`,
      targetId: ticketId,
    });
  };

  const handleAcknowledgeCancellation = (ticketId: string) => {
    setAcknowledgedCancellations((prev) => ({ ...prev, [ticketId]: true }));
  };

  // Configurações de tempo para o Bar (Geralmente 5 min + tolerância)
  const expectedBarTime = settings.sectorPrepTimes?.bar || 5;
  const barTolerance = settings.delayToleranceMinutes || 5;
  const barAlertThreshold = expectedBarTime + barTolerance; // 5 + 5 = 10 min

  // Contadores no Topo
  const countNovos = tickets.filter((t) => t.overallStatus === 'novos').length;
  const countPrepping = tickets.filter((t) => t.overallStatus === 'em_preparacao' || t.overallStatus === 'parcial').length;
  const countProntos = tickets.filter((t) => t.overallStatus === 'pronto').length;
  const countAtrasados = tickets.filter((t) => {
    const elapsed = getElapsedMinutes(t.roundCreatedAt);
    return elapsed >= barAlertThreshold && t.overallStatus !== 'historico';
  }).length;
  const countHistorico = tickets.filter((t) => t.overallStatus === 'historico').length;

  // Produtos do bar
  const barProducts = products.filter((p) => p.sector === 'bar');

  // Validação de Permissão RBAC
  const hasAccess = store.canUserAccessModule(currentUser, 'bar');

  return (
    <div className={`space-y-4 animate-in fade-in duration-300 ${isFullscreen ? 'p-4 bg-stone-950 min-h-screen' : ''}`}>
      {/* Aviso de Permissão caso o operador atual não seja do Bar ou Administração */}
      {!hasAccess && (
        <div className="bg-rose-950/80 border border-rose-600 p-4 rounded-2xl flex items-center justify-between text-xs text-rose-200 shadow-xl">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="text-white">Atenção:</strong> O utilizador atual (<strong>{currentUser.name}</strong>) tem perfil de <em>{currentUser.role}</em>. As operações de bar devem ser efetuadas pelo Barman ou Administração.
            </div>
          </div>
          <button
            onClick={() => {
              const barUser = state.users.find((u) => u.role === 'bar') || state.users[0];
              store.setCurrentUser(barUser);
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all shrink-0"
          >
            Mudar para Marco Barista (Bar)
          </button>
        </div>
      )}

      {/* Top Banner do BDS Bar & Bebidas */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 border border-stone-800 rounded-3xl p-4 md:p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Wine className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight">BDS Bar & Bebidas</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Tempo Real
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Operador: <strong className="text-stone-200">{currentUser.name}</strong> • Conectado a Atendimento, Cozinha, Caixa e Site
            </p>
          </div>
        </div>

        {/* Contadores Rápidos de Estado */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <div
            onClick={() => setStatusFilter('novos')}
            className={`cursor-pointer px-3 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
              statusFilter === 'novos' ? 'bg-amber-600/30 border-amber-500 text-white ring-1 ring-amber-500' : 'bg-stone-950 border-stone-800 text-stone-300'
            }`}
          >
            <GlassWater className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-stone-400 font-semibold">Novas</div>
              <div className="text-sm font-bold text-white font-mono">{countNovos}</div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('em_preparacao')}
            className={`cursor-pointer px-3 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
              statusFilter === 'em_preparacao' ? 'bg-amber-600/30 border-amber-500 text-white ring-1 ring-amber-500' : 'bg-stone-950 border-stone-800 text-stone-300'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <div>
              <div className="text-[10px] text-stone-400 font-semibold">A Preparar</div>
              <div className="text-sm font-bold text-amber-400 font-mono">{countPrepping}</div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('pronto')}
            className={`cursor-pointer px-3 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
              statusFilter === 'pronto' ? 'bg-emerald-600/30 border-emerald-500 text-white ring-1 ring-emerald-500' : 'bg-stone-950 border-stone-800 text-stone-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-stone-400 font-semibold">Prontas no Balcão</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">{countProntos}</div>
            </div>
          </div>

          {countAtrasados > 0 && (
            <div className="bg-rose-950/60 border border-rose-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <div>
                <div className="text-[10px] text-rose-300 font-semibold">Atrasadas</div>
                <div className="text-sm font-bold text-rose-300 font-mono">{countAtrasados}</div>
              </div>
            </div>
          )}

          {/* Ferramentas: Som, Indisponibilidade & Fullscreen */}
          <div className="flex items-center gap-1.5 ml-2 border-l border-stone-800 pl-2">
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
                  : 'bg-rose-950/40 border-rose-800 text-rose-400'
              }`}
              title={soundEnabled ? 'Sons de campainha ativos' : 'Som silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setUnavailableModalOpen(true)}
              className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-xl border border-stone-800 transition-all flex items-center gap-1.5 shrink-0"
              title="Comunicar bebida esgotada"
            >
              <Ban className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Esgotar Bebida</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-all"
              title="Modo Ecrã Inteiro (Monitor do Bar)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Abas Rápidas por Estado */}
        <div className="flex items-center gap-1 bg-stone-900 p-1.5 rounded-2xl border border-stone-800 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'todos' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            Fila Ativa ({tickets.filter((t) => t.overallStatus !== 'historico').length})
          </button>
          <button
            onClick={() => setStatusFilter('novos')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'novos' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            Novas ({countNovos})
          </button>
          <button
            onClick={() => setStatusFilter('em_preparacao')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'em_preparacao' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            A Preparar ({countPrepping})
          </button>
          <button
            onClick={() => setStatusFilter('pronto')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'pronto' ? 'bg-emerald-600 text-white shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            Prontas ({countProntos})
          </button>
          <button
            onClick={() => setStatusFilter('cancelados')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'cancelados' ? 'bg-rose-600 text-white shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            Canceladas
          </button>
          <button
            onClick={() => setStatusFilter('historico')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'historico' ? 'bg-stone-700 text-white shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1" />
            Histórico ({countHistorico})
          </button>
        </div>

        {/* Filtros de Origem + Pesquisa */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as BarOriginFilter)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="todas">Todas as Origens</option>
            <option value="sala">Sala Principal</option>
            <option value="esplanada">Esplanada</option>
            <option value="site">Pedidos do Site (Online)</option>
          </select>

          {/* Campo de Pesquisa */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar mesa, bebida..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grelha de Bilhetes do Bar */}
      {filteredTickets.length === 0 ? (
        <div className="bg-stone-900/60 border border-dashed border-stone-800 rounded-3xl p-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Wine className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Sem pedidos de bar neste filtro!</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            {statusFilter === 'historico'
              ? 'Não existem bebidas no histórico deste turno.'
              : 'Todas as bebidas, cafés e cocktails enviados pelos empregados foram servidos ou preparados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {filteredTickets.map((ticket) => {
            const elapsed = getElapsedMinutes(ticket.roundCreatedAt);
            const isLate = elapsed >= barAlertThreshold;
            const isWarning = elapsed >= expectedBarTime && !isLate;
            const isJustNotified = justNotifiedTicketId === ticket.id;

            const hasAllergies = ticket.allergies.length > 0;
            const isAllergyAcknowledged = acknowledgedAllergies[ticket.id];
            const hasCancellations = ticket.cancelledItems.length > 0;
            const isCancellationAcknowledged = acknowledgedCancellations[ticket.id];

            const activeItems = ticket.items.filter((i) => i.status !== 'cancelado');
            const readyItems = activeItems.filter((i) => i.status === 'pronto');
            const isPartiallyReady = readyItems.length > 0 && readyItems.length < activeItems.length;
            const isAllReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'pronto');

            return (
              <div
                key={ticket.id}
                className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-xl bg-stone-900 ${
                  isLate
                    ? 'border-rose-600 ring-2 ring-rose-500/40 shadow-rose-950/40'
                    : hasAllergies && !isAllergyAcknowledged
                    ? 'border-rose-500 shadow-rose-950/20 ring-1 ring-rose-500/50'
                    : isWarning
                    ? 'border-amber-600/80 shadow-amber-950/20 ring-1 ring-amber-500/20'
                    : isAllReady
                    ? 'border-emerald-600/60'
                    : isPartiallyReady
                    ? 'border-amber-500/60'
                    : 'border-stone-800'
                }`}
              >
                {/* Header do Bilhete */}
                <div
                  className={`p-4 border-b flex items-start justify-between ${
                    isLate
                      ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                      : isWarning
                      ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                      : isAllReady
                      ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-200'
                      : 'bg-stone-950/80 border-stone-800 text-stone-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ticket.isOnline && <Globe className="w-4 h-4 text-cyan-400" />}
                      <span className="font-extrabold text-base md:text-lg text-white">
                        {ticket.tableName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 font-mono bg-stone-800 text-stone-300 rounded-lg">
                        {ticket.comandaNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-amber-400">Ronda #{ticket.roundNumber}</span>
                      <span>• {ticket.roomName}</span>
                      <span>• Atendido por: <strong className="text-stone-300">{ticket.waiterName}</strong></span>
                    </div>
                  </div>

                  {/* Cronómetro BDS */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-mono font-bold flex items-center justify-end gap-1 px-2.5 py-1 rounded-xl shadow-sm ${
                        isLate
                          ? 'bg-rose-600 text-white animate-pulse'
                          : isWarning
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {formatElapsed(ticket.roundCreatedAt)}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono mt-1">
                      {formatTime(ticket.roundCreatedAt)}
                    </div>
                  </div>
                </div>

                {/* Banner de Alerta de Atraso e Confirmação do Bar */}
                {isLate && (
                  <div className="bg-rose-950 px-3.5 py-2.5 border-b border-rose-800 text-[11px] text-rose-200 space-y-1.5">
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                        Tempo previsto ({expectedBarTime} min) excedido (+{elapsed - expectedBarTime}m)!
                      </span>
                    </div>

                    {ticket.barAlertedAt && !ticket.barAcknowledgedAt && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                          <Bell className="w-3 h-3 text-amber-400" />
                          Aviso do empregado às {formatTime(ticket.barAlertedAt)}
                        </span>
                        <button
                          onClick={() => handleAcknowledgeAlert(ticket)}
                          className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg shadow transition-all active:scale-95"
                        >
                          Confirmar Leitura
                        </button>
                      </div>
                    )}

                    {ticket.barAcknowledgedAt && (
                      <div className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Alerta visto pelo bar ({formatTime(ticket.barAcknowledgedAt)})
                      </div>
                    )}
                  </div>
                )}

                {/* Banner de Destaque Obrigatório de Alergias */}
                {hasAllergies && (
                  <div
                    className={`p-3 border-b text-xs transition-all ${
                      isAllergyAcknowledged
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                        : 'bg-rose-950 border-rose-700 text-rose-100 animate-pulse'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block font-bold">ALERGIAS & RESTRIÇÕES:</strong>
                          <span>{ticket.allergies.join(' • ')}</span>
                        </div>
                      </div>
                      {!isAllergyAcknowledged && (
                        <button
                          onClick={() => handleAcknowledgeAllergies(ticket.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg shrink-0 shadow"
                        >
                          Confirmar Leitura
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Banner de Cancelamentos Notificados pelo Atendimento */}
                {hasCancellations && !isCancellationAcknowledged && (
                  <div className="bg-rose-950/70 border-b border-rose-800 p-2.5 text-xs text-rose-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5 text-rose-400" />
                      {ticket.cancelledItems.length} bebida(s) cancelada(s) pelo atendimento
                    </span>
                    <button
                      onClick={() => handleAcknowledgeCancellation(ticket.id)}
                      className="px-2 py-0.5 bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold rounded"
                    >
                      OK, Ciente
                    </button>
                  </div>
                )}

                {/* Indicador de Pedido Parcialmente Preparado */}
                {isPartiallyReady && (
                  <div className="bg-amber-500/10 border-b border-amber-500/30 px-3.5 py-1.5 text-[11px] font-bold text-amber-400 flex items-center justify-between">
                    <span>🟡 Parcialmente preparado no bar</span>
                    <span>{readyItems.length} de {activeItems.length} bebidas prontas</span>
                  </div>
                )}

                {/* Lista de Bebidas do Bilhete */}
                <div className="p-3.5 space-y-2.5 flex-1 bg-stone-950/50">
                  {ticket.items.map((item) => {
                    const isCancelled = item.status === 'cancelado';
                    const isReady = item.status === 'pronto';
                    const isPrepping = item.status === 'em_preparacao';
                    const isReceived = item.status === 'recebido';
                    const isDelivered = item.status === 'entregue';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border text-xs transition-all ${
                          isCancelled
                            ? 'bg-rose-950/20 border-rose-900/60 opacity-60 line-through'
                            : isReady
                            ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                            : isPrepping
                            ? 'bg-amber-950/30 border-amber-700/50 text-amber-200'
                            : 'bg-stone-900 border-stone-800 text-stone-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {/* Quantidade e Nome da Bebida em Destaque BDS */}
                            <div className="font-black text-sm md:text-base text-white flex items-center gap-2">
                              <span className="text-amber-400 text-lg font-mono">{item.quantity}x</span>
                              <span>{item.productName}</span>
                            </div>

                            {/* Tamanho / Variante de Bebida */}
                            {item.selectedVariant && (
                              <div className="text-[11px] text-cyan-300 font-semibold mt-0.5">
                                • Tamanho / Tipo: {item.selectedVariant.name}
                              </div>
                            )}

                            {/* Lugar ou pessoa */}
                            {item.seatName && item.seatName !== 'Para partilhar' && (
                              <div className="text-[11px] font-bold text-amber-400 mt-1">
                                Para: {item.seatName}
                              </div>
                            )}

                            {/* Adicionais / Extras */}
                            {item.selectedExtras.length > 0 && (
                              <div className="text-[11px] text-stone-400">
                                • Extras: {item.selectedExtras.map((e) => e.name).join(', ')}
                              </div>
                            )}

                            {/* Observações Cruciais (ex: "Sem gelo", "Sem açúcar", "Com limão") */}
                            {item.notes && (
                              <div className="text-[11px] text-amber-300 font-bold bg-amber-950/70 p-1.5 rounded-lg mt-1.5 border border-amber-700/60">
                                ⚠ Obs: {item.notes}
                              </div>
                            )}

                            {/* Motivo do Cancelamento */}
                            {isCancelled && item.cancelReason && (
                              <div className="text-[10px] text-rose-400 mt-1 font-mono">
                                Cancelado: {item.cancelReason} ({item.cancelledBy})
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação por Bebida */}
                        {!isCancelled && !isDelivered && (
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-stone-800/80">
                            <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">
                              {item.status === 'em_preparacao' ? 'A Preparar' : item.status}
                            </span>

                            <div className="flex gap-1.5">
                              {isReceived && (
                                <button
                                  onClick={() => handleUpdateItemStatus(item.id, 'em_preparacao')}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1 transition-all"
                                >
                                  <Play className="w-3 h-3" />
                                  Preparar
                                </button>
                              )}

                              {(isReceived || isPrepping) && (
                                <button
                                  onClick={() => handleUpdateItemStatus(item.id, 'pronto')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Pronto
                                </button>
                              )}

                              {isReady && (
                                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Pronto no Balcão
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Rodapé do Bilhete com Ações do Bar */}
                <div className="p-3.5 bg-stone-950 border-t border-stone-800 flex justify-between items-center gap-2">
                  <div className="text-[11px] text-stone-500 font-mono">
                    Total: {activeItems.length} bebidas
                  </div>

                  {!isAllReady && !ticket.hasDeliveredAll ? (
                    <div className="flex items-center gap-2">
                      {activeItems.some((i) => i.status === 'recebido') && (
                        <button
                          onClick={() => handleStartAllItems(ticket)}
                          className="px-3 py-2 bg-amber-700 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all"
                        >
                          Preparar Todas
                        </button>
                      )}
                      <button
                        onClick={() => handleMarkTicketAllReady(ticket)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Tudo Pronto no Bar
                      </button>
                    </div>
                  ) : ticket.hasDeliveredAll ? (
                    <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Entregue à Mesa
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkTicketAllReady(ticket)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow ${
                        isJustNotified
                          ? 'bg-cyan-600 text-white animate-pulse'
                          : 'bg-amber-600 hover:bg-amber-500 text-white'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{isJustNotified ? 'Empregado Avisado!' : 'Avisar p/ Levantamento'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Gestão de Disponibilidade de Bebidas no Bar */}
      {unavailableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm sm:text-base">Disponibilidade de Bebidas & Stock</h3>
              </div>
              <button
                onClick={() => setUnavailableModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-stone-400">
                Alterne a disponibilidade de bebidas e vinhos caso o barril ou garrafas tenham esgotado. Isso desativa imediatamente a bebida no Atendimento e no Site sem cancelar pedidos já aceites.
              </p>

              <div className="space-y-2">
                {barProducts.map((p) => {
                  // Contar pedidos pendentes desta bebida
                  const pendingCount = tickets.reduce((acc, t) => {
                    return (
                      acc +
                      t.items.filter(
                        (i) => i.productId === p.id && (i.status === 'recebido' || i.status === 'em_preparacao')
                      ).length
                    );
                  }, 0);

                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-stone-200 text-sm">{p.name}</div>
                        <div className="text-[11px] text-stone-400">
                          {p.code} • Stock: <span className="font-mono text-amber-400">{p.stockQuantity} un</span>
                          {pendingCount > 0 && (
                            <span className="ml-2 text-rose-400 font-bold">
                              ({pendingCount} em preparação)
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          store.toggleProductAvailability(p.id);
                          store.addAuditLog({
                            userId: currentUser.id,
                            userName: currentUser.name,
                            userRole: currentUser.role,
                            action: p.available ? 'PRODUTO_INDISPONIVEL' : 'PRODUTO_DISPONIVEL',
                            module: 'bar',
                            details: `Bar alterou disponibilidade de "${p.name}" para ${p.available ? 'INDISPONÍVEL' : 'DISPONÍVEL'}`,
                            targetId: p.id,
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          p.available
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-rose-900/50 hover:text-rose-200 hover:border-rose-600'
                            : 'bg-rose-950 text-rose-300 border border-rose-700/60 hover:bg-emerald-900/50 hover:text-emerald-200 hover:border-emerald-600'
                        }`}
                      >
                        {p.available ? 'Disponível (Esgotar)' : 'Esgotado (Ativar)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end">
              <button
                onClick={() => setUnavailableModalOpen(false)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
