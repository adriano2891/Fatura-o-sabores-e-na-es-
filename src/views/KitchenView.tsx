import React, { useState } from 'react';
import {
  Flame,
  Cake,
  Clock,
  CheckCircle2,
  Check,
  AlertTriangle,
  Layers,
  Volume2,
  Filter,
  Globe,
  Bell,
  UserCheck,
  Ban,
  Search,
  X,
  ShieldAlert,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { OrderItem, PrepSector, ItemPrepStatus, Product } from '../types';
import { formatTime, formatElapsed, getElapsedMinutes } from '../utils/formatters';

interface KitchenViewProps {
  state: AppState;
  onSelectTab?: (tab: any) => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ state }) => {
  const { comandas, onlineOrders, currentUser, settings, products } = state;

  const [selectedSubSector, setSelectedSubSector] = useState<'todos' | 'cozinha' | 'pastelaria'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const [justNotifiedTicketId, setJustNotifiedTicketId] = useState<string | null>(null);

  interface KitchenTicket {
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
    kitchenAlertedAt?: string;
    kitchenAcknowledgedAt?: string;
  }

  const tickets: KitchenTicket[] = [];

  // 1. Bilhetes das Mesas do Restaurante (Apenas Cozinha & Pastelaria)
  for (const comanda of comandas) {
    if (comanda.status === 'cancelada') continue;

    for (const round of comanda.rounds) {
      const relevantItems = round.items.filter((item) => {
        // Exclui Bar e Atendimento direto - Cozinha/Copa foca exclusivamente em pratos e pastelaria
        if (item.sector !== 'cozinha' && item.sector !== 'pastelaria') return false;
        if (selectedSubSector !== 'todos' && item.sector !== selectedSubSector) return false;
        return true;
      });

      const hasActive = relevantItems.some(
        (i) => i.status === 'recebido' || i.status === 'em_preparacao' || i.status === 'pronto'
      );

      if (hasActive) {
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
          items: relevantItems,
          kitchenAlertedAt: round.kitchenAlertedAt,
          kitchenAcknowledgedAt: round.kitchenAcknowledgedAt,
        });
      }
    }
  }

  // 2. Bilhetes de Pedidos Online do Site (Apenas Pratos / Comida)
  for (const order of onlineOrders) {
    if (order.prepStatus !== 'entregue') {
      const relevantItems = order.items.filter((item) => {
        if (item.sector !== 'cozinha' && item.sector !== 'pastelaria') return false;
        if (selectedSubSector !== 'todos' && item.sector !== selectedSubSector) return false;
        return true;
      });

      if (relevantItems.length > 0) {
        tickets.push({
          id: order.id,
          isOnline: true,
          comandaNumber: order.id,
          tableName: `Site: ${order.customerName}`,
          roomName: order.deliveryType === 'entrega' ? 'Entrega Domicílio' : 'Levantamento',
          roundNumber: 1,
          roundCreatedAt: order.createdAt,
          waiterName: 'Pedido Online',
          items: relevantItems,
        });
      }
    }
  }

  // Ordena por antiguidade de envio
  tickets.sort(
    (a, b) => new Date(a.roundCreatedAt).getTime() - new Date(b.roundCreatedAt).getTime()
  );

  // Filtragem de pesquisa
  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.tableName.toLowerCase().includes(q) ||
      t.comandaNumber.toLowerCase().includes(q) ||
      t.waiterName.toLowerCase().includes(q) ||
      t.items.some((i) => i.productName.toLowerCase().includes(q))
    );
  });

  const handleUpdateItemStatus = (itemId: string, nextStatus: ItemPrepStatus) => {
    store.updateItemPrepStatus(itemId, nextStatus, currentUser);
  };

  const handleMarkTicketAllReady = (ticket: KitchenTicket) => {
    if (ticket.isOnline) {
      store.markOnlineOrderSectorReady(ticket.id, 'cozinha', currentUser);
    } else if (ticket.comandaId) {
      store.markRoundSectorReady(ticket.comandaId, ticket.roundNumber, 'cozinha', currentUser);
    }

    setJustNotifiedTicketId(ticket.id);
    setTimeout(() => {
      setJustNotifiedTicketId(null);
    }, 4000);
  };

  const handleAcknowledgeAlert = (ticket: KitchenTicket) => {
    if (ticket.comandaId) {
      store.acknowledgeKitchenAlert(ticket.comandaId, ticket.roundNumber, currentUser);
    }
  };

  // Produtos da cozinha para modal de indisponibilidade
  const kitchenProducts = products.filter((p) => p.sector === 'cozinha' || p.sector === 'pastelaria');

  const activeFoodItemsCount = tickets.reduce((acc, t) => acc + t.items.length, 0);
  const preppingFoodCount = tickets.reduce(
    (acc, t) => acc + t.items.filter((i) => i.status === 'em_preparacao').length,
    0
  );
  const readyFoodCount = tickets.reduce(
    (acc, t) => acc + t.items.filter((i) => i.status === 'pronto').length,
    0
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Bar Exclusiva da Cozinha / Copa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-stone-900 via-stone-900/95 to-orange-950/40 p-4 md:p-5 rounded-2xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-inner">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Módulo Cozinha / Copa</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                KDS Tempo Real
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Preparação de pratos, entradas e pastelaria. Operador: <span className="font-semibold text-stone-200">{currentUser.name}</span>
            </p>
          </div>
        </div>

        {/* Resumo e Ações Rápidas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <div>
              <div className="text-[10px] text-stone-400 font-medium">Pratos Ativos</div>
              <div className="text-sm font-bold text-white">{activeFoodItemsCount}</div>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <div>
              <div className="text-[10px] text-stone-400 font-medium">No Fogo</div>
              <div className="text-sm font-bold text-amber-400">{preppingFoodCount}</div>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-stone-400 font-medium">Prontos</div>
              <div className="text-sm font-bold text-emerald-400">{readyFoodCount}</div>
            </div>
          </div>

          <button
            onClick={() => setUnavailableModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700/60 transition-all shrink-0"
            title="Comunicar prato esgotado ou indisponível"
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Indisponibilidade</span>
          </button>
        </div>
      </div>

      {/* Filtros e Barra de Pesquisa */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 w-full sm:w-auto">
          <button
            onClick={() => setSelectedSubSector('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedSubSector === 'todos' ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            Todos os Pratos ({tickets.length})
          </button>
          <button
            onClick={() => setSelectedSubSector('cozinha')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              selectedSubSector === 'cozinha' ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Cozinha Principal
          </button>
          <button
            onClick={() => setSelectedSubSector('pastelaria')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              selectedSubSector === 'pastelaria' ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Cake className="w-3.5 h-3.5" />
            Pastelaria & Sobremesas
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar mesa, prato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-orange-500 transition-colors"
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

      {/* Grelha de Tickets KDS */}
      {filteredTickets.length === 0 ? (
        <div className="bg-stone-900/60 border border-dashed border-stone-800 rounded-2xl p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Sem pedidos de comida pendentes!</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Todos os pratos e sobremesas enviados pelos empregados foram preparados ou entregues.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {filteredTickets.map((ticket) => {
            const elapsed = getElapsedMinutes(ticket.roundCreatedAt);
            const expectedMax = settings.expectedPrepTimeMinutes + settings.delayToleranceMinutes; // e.g. 20 + 5 = 25m
            const isLate = elapsed >= expectedMax;
            const isWarning = elapsed >= settings.expectedPrepTimeMinutes && !isLate;
            const isJustNotified = justNotifiedTicketId === ticket.id;

            const allReady = ticket.items.every(
              (i) => i.status === 'pronto' || i.status === 'entregue' || i.status === 'cancelado'
            );

            // Verifica se há alguma alergia em algum dos itens
            const hasAnyAllergy = ticket.items.some(
              (i) => (i.allergyWarnings && i.allergyWarnings.length > 0)
            );

            return (
              <div
                key={ticket.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xl ${
                  isLate
                    ? 'border-rose-600 bg-stone-900 shadow-rose-950/30 ring-2 ring-rose-500/30'
                    : hasAnyAllergy
                    ? 'border-amber-500/80 bg-stone-900'
                    : isWarning
                    ? 'border-amber-600/80 bg-stone-900 shadow-amber-950/20'
                    : allReady
                    ? 'border-emerald-500/50 bg-stone-900'
                    : 'border-stone-800 bg-stone-900/90'
                }`}
              >
                {/* Header do Ticket */}
                <div
                  className={`p-3.5 border-b flex items-start justify-between ${
                    isLate
                      ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                      : isWarning
                      ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                      : allReady
                      ? 'bg-emerald-950/30 border-emerald-900/40 text-stone-200'
                      : 'bg-stone-950 border-stone-800 text-stone-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      {ticket.isOnline && <Globe className="w-4 h-4 text-cyan-400" />}
                      <span className="font-extrabold text-base text-white">
                        {ticket.tableName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 font-mono bg-stone-800 text-stone-300 rounded">
                        {ticket.comandaNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Ronda {ticket.roundNumber} • Empregado: <strong className="text-stone-300">{ticket.waiterName}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-mono font-bold flex items-center justify-end gap-1 px-2 py-0.5 rounded-lg ${
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
                    <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                      {formatTime(ticket.roundCreatedAt)}
                    </div>
                  </div>
                </div>

                {/* Banner de Alerta de Atraso e Confirmação da Cozinha */}
                {isLate && (
                  <div className="bg-rose-950 text-rose-200 px-3 py-2 border-b border-rose-800 text-[11px] space-y-1">
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        Pedido com atraso de {elapsed - settings.expectedPrepTimeMinutes} min!
                      </span>
                    </div>

                    {ticket.kitchenAlertedAt && !ticket.kitchenAcknowledgedAt && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-amber-300 font-semibold">
                          Aviso do empregado às {formatTime(ticket.kitchenAlertedAt)}
                        </span>
                        <button
                          onClick={() => handleAcknowledgeAlert(ticket)}
                          className="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold rounded shadow"
                        >
                          Confirmar que viu
                        </button>
                      </div>
                    )}

                    {ticket.kitchenAcknowledgedAt && (
                      <div className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Alerta visto pela cozinha ({ticket.kitchenAcknowledgedAt.slice(11, 16)})
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de Itens do Ticket com Lugar e Alergias */}
                <div className="p-3.5 space-y-2.5 flex-1 bg-stone-950/40">
                  {ticket.items.map((item) => {
                    const isCancelled = item.status === 'cancelado';
                    const isReady = item.status === 'pronto';
                    const isPrepping = item.status === 'em_preparacao';
                    const isReceived = item.status === 'recebido';
                    const isDelivered = item.status === 'entregue';

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border text-xs transition-all ${
                          isCancelled
                            ? 'bg-rose-950/20 border-rose-900/60 opacity-60 line-through'
                            : isReady
                            ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                            : isPrepping
                            ? 'bg-amber-950/30 border-amber-700/50 text-amber-200'
                            : 'bg-stone-900 border-stone-800 text-stone-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                              <span className="text-orange-400">{item.quantity}x</span>
                              <span>{item.productName}</span>
                            </div>

                            {/* Identificação do Lugar ou Partilha (Requisito 1) */}
                            {item.seatName && item.seatName !== 'Para partilhar' && (
                              <div className="text-[10px] font-bold text-amber-400 mt-0.5">
                                Lugar: {item.seatName}
                              </div>
                            )}

                            {item.selectedVariant && (
                              <div className="text-[11px] text-stone-400 font-medium">
                                • Opção: {item.selectedVariant.name}
                              </div>
                            )}

                            {item.selectedExtras.length > 0 && (
                              <div className="text-[11px] text-stone-400">
                                • Extras: {item.selectedExtras.map((e) => e.name).join(', ')}
                              </div>
                            )}

                            {item.notes && (
                              <div className="text-[11px] text-amber-300 font-bold bg-amber-950/60 p-1 rounded mt-1 border border-amber-700/50">
                                ⚠ {item.notes}
                              </div>
                            )}

                            {/* Alergias Destacadas (Requisito 3) */}
                            {item.allergyWarnings && item.allergyWarnings.length > 0 && (
                              <div className="mt-1.5 p-1.5 bg-rose-950/80 border border-rose-700/70 rounded-lg flex items-center gap-1.5 text-rose-200 font-bold text-[10px]">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>ATENÇÃO ALERGIA: {item.allergyWarnings.join(', ')}</span>
                              </div>
                            )}

                            {isCancelled && item.cancelReason && (
                              <div className="text-[10px] text-rose-400 mt-1 font-mono">
                                Cancelado por: {item.cancelReason} ({item.cancelledBy})
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação por Item */}
                        {!isCancelled && !isDelivered && (
                          <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-stone-800/60">
                            <span className="text-[10px] uppercase font-bold text-stone-400">
                              {item.status.replace(/_/g, ' ')}
                            </span>

                            <div className="flex gap-1">
                              {isReceived && (
                                <button
                                  onClick={() => handleUpdateItemStatus(item.id, 'em_preparacao')}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded shadow active:scale-95"
                                >
                                  Iniciar Prep.
                                </button>
                              )}

                              {(isReceived || isPrepping) && (
                                <button
                                  onClick={() => handleUpdateItemStatus(item.id, 'pronto')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow active:scale-95"
                                >
                                  <Check className="w-3 h-3" />
                                  Pronto
                                </button>
                              )}

                              {isReady && (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Pronto (Avisar Empregado)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer do Ticket */}
                <div className="p-3 bg-stone-950 border-t border-stone-800 flex justify-between items-center gap-2">
                  <span className="text-[10px] text-stone-500 font-mono">
                    {ticket.comandaNumber}
                  </span>

                  {!allReady ? (
                    <button
                      onClick={() => handleMarkTicketAllReady(ticket)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Marcar Tudo Pronto
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pratos Concluídos
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Comunicação de Indisponibilidade de Prato */}
      {unavailableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-stone-100">
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm sm:text-base">Comunicar Indisponibilidade na Cozinha</h3>
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
                Alterne a disponibilidade de pratos no cardápio caso algum ingrediente tenha esgotado. Isso impede novos pedidos no Atendimento sem cancelar pedidos já aceites.
              </p>

              <div className="space-y-2">
                {kitchenProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-200">{p.name}</div>
                      <div className="text-[10px] text-stone-400">
                        {p.code} • Stock: {p.stockQuantity} un
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
                          module: 'cozinha',
                          details: `Cozinha alterou disponibilidade de "${p.name}" para ${p.available ? 'INDISPONÍVEL' : 'DISPONÍVEL'}`,
                          targetId: p.id,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                        p.available
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-rose-900/50 hover:text-rose-200 hover:border-rose-600'
                          : 'bg-rose-950 text-rose-300 border border-rose-700/60 hover:bg-emerald-900/50 hover:text-emerald-200 hover:border-emerald-600'
                      }`}
                    >
                      {p.available ? 'Disponível (Esgotar)' : 'Esgotado (Ativar)'}
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
