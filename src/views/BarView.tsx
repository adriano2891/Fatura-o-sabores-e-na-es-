import React, { useState } from 'react';
import {
  Wine,
  Clock,
  CheckCircle2,
  Check,
  AlertTriangle,
  Layers,
  Volume2,
  Bell,
  UserCheck,
  Sparkles,
  History,
  Ban,
  Search,
  GlassWater,
  X,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { OrderItem, ItemPrepStatus, Product } from '../types';
import { formatTime, formatElapsed, getElapsedMinutes } from '../utils/formatters';

interface BarViewProps {
  state: AppState;
  onSelectTab?: (tab: any) => void;
}

export const BarView: React.FC<BarViewProps> = ({ state }) => {
  const { comandas, onlineOrders, currentUser, settings, products } = state;

  const [activeSubTab, setActiveSubTab] = useState<'ativos' | 'em_preparacao' | 'prontos' | 'historico'>('ativos');
  const [searchQuery, setSearchQuery] = useState('');
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const [selectedProductToToggle, setSelectedProductToToggle] = useState<Product | null>(null);
  const [justNotifiedTicketId, setJustNotifiedTicketId] = useState<string | null>(null);

  interface BarTicket {
    id: string;
    isOnline: boolean;
    comandaId?: string;
    comandaNumber: string;
    tableName: string;
    roomName: string;
    roundNumber: number;
    roundCreatedAt: string;
    waiterName: string;
    items: OrderItem[];
    barAlertedAt?: string;
    barAcknowledgedAt?: string;
  }

  const tickets: BarTicket[] = [];
  const historyItems: {
    item: OrderItem;
    tableName: string;
    comandaNumber: string;
    waiterName: string;
    roundNumber: number;
  }[] = [];

  // 1. Bilhetes das Mesas do Restaurante (Apenas setor 'bar')
  for (const comanda of comandas) {
    if (comanda.status === 'cancelada') continue;

    for (const round of comanda.rounds) {
      const barItems = round.items.filter((item) => item.sector === 'bar');

      // Itens ativos no bar
      const activeBarItems = barItems.filter(
        (i) => i.status === 'recebido' || i.status === 'em_preparacao' || i.status === 'pronto'
      );

      // Histórico
      for (const item of barItems) {
        if (item.status === 'entregue' || item.status === 'pronto') {
          historyItems.push({
            item,
            tableName: comanda.tableName,
            comandaNumber: comanda.numberDisplay,
            waiterName: round.waiterName,
            roundNumber: round.roundNumber,
          });
        }
      }

      if (activeBarItems.length > 0) {
        tickets.push({
          id: `${comanda.id}-${round.roundNumber}`,
          isOnline: false,
          comandaId: comanda.id,
          comandaNumber: comanda.numberDisplay,
          tableName: comanda.tableName,
          roomName: comanda.roomName,
          roundNumber: round.roundNumber,
          roundCreatedAt: round.createdAt,
          waiterName: round.waiterName,
          items: activeBarItems,
          barAlertedAt: round.kitchenAlertedAt,
          barAcknowledgedAt: round.kitchenAcknowledgedAt,
        });
      }
    }
  }

  // 2. Pedidos Online do Site (Apenas bebidas)
  for (const order of onlineOrders) {
    if (order.prepStatus !== 'entregue') {
      const barItems = order.items.filter((item) => item.sector === 'bar');
      const activeBarItems = barItems.filter(
        (i) => i.status === 'recebido' || i.status === 'em_preparacao' || i.status === 'pronto'
      );

      if (activeBarItems.length > 0) {
        tickets.push({
          id: order.id,
          isOnline: true,
          comandaNumber: order.id,
          tableName: `Site: ${order.customerName}`,
          roomName: order.deliveryType === 'entrega' ? 'Entrega Web' : 'Levantamento',
          roundNumber: 1,
          roundCreatedAt: order.createdAt,
          waiterName: 'Pedido Online',
          items: activeBarItems,
        });
      }
    }
  }

  // Ordena bilhetes por antiguidade (os mais antigos primeiro)
  tickets.sort(
    (a, b) => new Date(a.roundCreatedAt).getTime() - new Date(b.roundCreatedAt).getTime()
  );

  // Filtros de estado
  const filteredTickets = tickets.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTable = t.tableName.toLowerCase().includes(q);
      const matchCmd = t.comandaNumber.toLowerCase().includes(q);
      const matchWaiter = t.waiterName.toLowerCase().includes(q);
      const matchDrink = t.items.some((i) => i.productName.toLowerCase().includes(q));
      if (!matchTable && !matchCmd && !matchWaiter && !matchDrink) return false;
    }

    if (activeSubTab === 'em_preparacao') {
      return t.items.some((i) => i.status === 'em_preparacao');
    }
    if (activeSubTab === 'prontos') {
      return t.items.some((i) => i.status === 'pronto');
    }
    return true; // 'ativos'
  });

  // Métricas do Bar em tempo real
  const totalBarDrinksActive = tickets.reduce((acc, t) => acc + t.items.length, 0);
  const totalDrinksPrepping = tickets.reduce(
    (acc, t) => acc + t.items.filter((i) => i.status === 'em_preparacao').length,
    0
  );
  const totalDrinksReady = tickets.reduce(
    (acc, t) => acc + t.items.filter((i) => i.status === 'pronto').length,
    0
  );

  const expectedTime = settings.sectorPrepTimes?.bar || 5;
  const tolerance = settings.delayToleranceMinutes || 5;
  const alertThreshold = expectedTime + tolerance; // e.g. 5m + 5m = 10m

  const handleNotifyWaiter = (ticket: BarTicket) => {
    setJustNotifiedTicketId(ticket.id);
    if (ticket.comandaId) {
      store.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CHAMADA_EMPREGADO_BAR',
        module: 'bar',
        details: `Bar avisou empregado ${ticket.waiterName} para levantamento de bebidas na ${ticket.tableName} (${ticket.comandaNumber})`,
        targetId: ticket.comandaId,
      });
    }
    setTimeout(() => {
      setJustNotifiedTicketId(null);
    }, 4000);
  };

  const handleMarkTicketAllReady = (ticket: BarTicket) => {
    if (ticket.isOnline) {
      store.markOnlineOrderSectorReady(ticket.id, 'bar', currentUser);
    } else if (ticket.comandaId) {
      store.markRoundSectorReady(ticket.comandaId, ticket.roundNumber, 'bar', currentUser);
    }
    handleNotifyWaiter(ticket);
  };

  // Produtos do bar para gestão rápida de indisponibilidade
  const barProducts = products.filter((p) => p.sector === 'bar');

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner Exclusivo do Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 border border-stone-800 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Wine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Módulo Bar & Bebidas</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                BDS Tempo Real
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Gestão exclusiva de bebidas, coquetéis, vinhos e imperiais. Operador: <span className="font-semibold text-stone-200">{currentUser.name}</span>
            </p>
          </div>
        </div>

        {/* Contadores Rápidos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <GlassWater className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-stone-400 font-medium">Bebidas Ativas</div>
              <div className="text-sm font-bold text-white">{totalBarDrinksActive}</div>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <div>
              <div className="text-[10px] text-stone-400 font-medium">A Preparar</div>
              <div className="text-sm font-bold text-amber-400">{totalDrinksPrepping}</div>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-stone-400 font-medium">Prontas a Levantar</div>
              <div className="text-sm font-bold text-emerald-400">{totalDrinksReady}</div>
            </div>
          </div>

          <button
            onClick={() => setUnavailableModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700/60 transition-all shrink-0"
            title="Comunicar indisponibilidade de stock de bebidas"
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Indisponibilidade</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('ativos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'ativos'
                ? 'bg-amber-600 text-white shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <span>Todos Ativos</span>
            <span className="px-1.5 py-0.2 bg-stone-950/50 rounded-full text-[10px]">
              {tickets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('em_preparacao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'em_preparacao'
                ? 'bg-amber-600 text-white shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <span>Em Preparação</span>
            <span className="px-1.5 py-0.2 bg-stone-950/50 rounded-full text-[10px]">
              {totalDrinksPrepping}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('prontos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'prontos'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <span>Prontos</span>
            <span className="px-1.5 py-0.2 bg-stone-950/50 rounded-full text-[10px]">
              {totalDrinksReady}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('historico')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'historico'
                ? 'bg-stone-800 text-white shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico Turno</span>
          </button>
        </div>

        {/* Pesquisa rápida de mesa ou bebida */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar mesa, bebida..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Vista de Histórico do Turno */}
      {activeSubTab === 'historico' ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              Bebidas Preparadas e Concluídas no Turno ({historyItems.length})
            </h3>
            <span className="text-xs text-stone-400">Total acumulado neste turno</span>
          </div>

          {historyItems.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-8">Nenhuma bebida concluída neste turno até ao momento.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {historyItems.map((h, idx) => (
                <div
                  key={`${h.item.id}-${idx}`}
                  className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-stone-200">
                      {h.item.quantity}x {h.item.productName}
                    </div>
                    {h.item.selectedVariant && (
                      <div className="text-[11px] text-amber-400 font-medium">{h.item.selectedVariant.name}</div>
                    )}
                    <div className="text-[10px] text-stone-400">
                      {h.tableName} • Ronda {h.roundNumber} • {h.waiterName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Concluído</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Grelha de Bilhetes do Bar */
        <div>
          {filteredTickets.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-800/80 text-stone-400 flex items-center justify-center mx-auto">
                <Wine className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-300">Sem pedidos de bebidas pendentes</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Novos pedidos de bebidas enviados pelos empregados de mesa no Atendimento aparecerão aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTickets.map((ticket) => {
                const elapsedMin = getElapsedMinutes(ticket.roundCreatedAt);
                const isDelayed = elapsedMin >= alertThreshold;
                const allReady = ticket.items.every((i) => i.status === 'pronto');
                const isJustNotified = justNotifiedTicketId === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    className={`bg-stone-900 rounded-2xl border shadow-xl flex flex-col overflow-hidden transition-all duration-200 ${
                      isDelayed
                        ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-950/15'
                        : allReady
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : 'border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {/* Cabeçalho do Bilhete */}
                    <div
                      className={`p-3.5 border-b flex items-start justify-between gap-2 ${
                        isDelayed
                          ? 'bg-rose-950/40 border-rose-900/50'
                          : allReady
                          ? 'bg-emerald-950/30 border-emerald-900/40'
                          : 'bg-stone-950/60 border-stone-800/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-white">{ticket.tableName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 font-mono bg-stone-800 rounded text-stone-300">
                            {ticket.comandaNumber}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-2">
                          <span>Ronda {ticket.roundNumber}</span>
                          <span>•</span>
                          <span>Atendido por: <strong className="text-stone-300">{ticket.waiterName}</strong></span>
                        </div>
                      </div>

                      {/* Tempo Decorrido & Alerta de Atraso */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                            isDelayed
                              ? 'bg-rose-600 text-white animate-pulse'
                              : elapsedMin > expectedTime
                              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{formatElapsed(ticket.roundCreatedAt)}</span>
                        </div>
                        <div className="text-[9px] text-stone-500 mt-0.5">
                          {formatTime(ticket.roundCreatedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Aviso de Pedido Demorado se exceder tempo */}
                    {isDelayed && (
                      <div className="bg-rose-950/80 border-b border-rose-800 px-3 py-1.5 flex items-center justify-between text-[11px] text-rose-200">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                          <span>Tempo previsto ({expectedTime}m) excedido!</span>
                        </div>
                        {ticket.comandaId && (
                          <button
                            onClick={() =>
                              store.acknowledgeKitchenAlert(ticket.comandaId!, ticket.roundNumber, currentUser)
                            }
                            className="text-[10px] underline hover:text-white font-medium"
                          >
                            Confirmar leitura
                          </button>
                        )}
                      </div>
                    )}

                    {/* Lista de Bebidas do Bilhete */}
                    <div className="p-3 space-y-2.5 flex-1 divide-y divide-stone-800/60">
                      {ticket.items.map((item) => {
                        const isPrepping = item.status === 'em_preparacao';
                        const isReady = item.status === 'pronto';

                        return (
                          <div key={item.id} className="pt-2 first:pt-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-amber-400 text-xs">{item.quantity}x</span>
                                  <span className="font-bold text-stone-100 text-xs leading-snug">
                                    {item.productName}
                                  </span>
                                </div>

                                {/* Tamanho / Variante de Bebida */}
                                {item.selectedVariant && (
                                  <div className="text-[11px] text-cyan-300 font-semibold pl-4">
                                    Opção: {item.selectedVariant.name}
                                  </div>
                                )}

                                {/* Lugar ou pessoa */}
                                {item.seatName && item.seatName !== 'Para partilhar' && (
                                  <div className="text-[10px] text-stone-400 pl-4">
                                    Para: <span className="text-stone-300 font-medium">{item.seatName}</span>
                                  </div>
                                )}

                                {/* Observações destacadas (ex: "Sem gelo", "Com limão") */}
                                {item.notes && (
                                  <div className="mt-1 pl-4">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-600/40">
                                      ⚠️ {item.notes}
                                    </span>
                                  </div>
                                )}

                                {/* Alergias e Restrições Relevantes */}
                                {item.allergyWarnings && item.allergyWarnings.length > 0 && (
                                  <div className="mt-1 pl-4 flex flex-wrap gap-1">
                                    {item.allergyWarnings.map((al, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-900/60 text-rose-300 border border-rose-700/60"
                                      >
                                        Alergia: {al}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Ações Rápidas por Item */}
                              <div className="shrink-0 flex items-center gap-1">
                                {item.status === 'recebido' && (
                                  <button
                                    onClick={() =>
                                      store.updateItemPrepStatus(item.id, 'em_preparacao', currentUser)
                                    }
                                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold rounded-lg border border-stone-700 transition-all active:scale-95"
                                  >
                                    Preparar
                                  </button>
                                )}

                                {isPrepping && (
                                  <button
                                    onClick={() =>
                                      store.updateItemPrepStatus(item.id, 'pronto', currentUser)
                                    }
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow transition-all active:scale-95 flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Pronto</span>
                                  </button>
                                )}

                                {isReady && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Pronto</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rodapé de Ações do Bilhete */}
                    <div className="p-3 bg-stone-950/70 border-t border-stone-800/80 flex items-center justify-between gap-2">
                      {!allReady ? (
                        <button
                          onClick={() => handleMarkTicketAllReady(ticket)}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar Tudo Pronto</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleNotifyWaiter(ticket)}
                          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow ${
                            isJustNotified
                              ? 'bg-cyan-600 text-white animate-pulse'
                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>{isJustNotified ? 'Empregado Avisado!' : 'Avisar para Levantamento'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Comunicação de Indisponibilidade de Bebida */}
      {unavailableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-stone-100">
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm sm:text-base">Comunicar Indisponibilidade no Bar</h3>
              </div>
              <button
                onClick={() => setUnavailableModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-stone-400">
                Alterne a disponibilidade de bebidas no cardápio caso tenha esgotado o stock. Isso impede novos pedidos no Atendimento sem cancelar pedidos já aceites.
              </p>

              <div className="space-y-2">
                {barProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-200">{p.name}</div>
                      <div className="text-[10px] text-stone-400">
                        {p.code} • Stock Atual: {p.stockQuantity} un
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
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                        p.available
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-rose-900/50 hover:text-rose-200 hover:border-rose-600'
                          : 'bg-rose-950 text-rose-300 border border-rose-700/60 hover:bg-emerald-900/50 hover:text-emerald-200 hover:border-emerald-600'
                      }`}
                    >
                      {p.available ? 'Disponível (Clique p/ Esgotar)' : 'Esgotado (Clique p/ Ativar)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end">
              <button
                onClick={() => setUnavailableModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold"
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
