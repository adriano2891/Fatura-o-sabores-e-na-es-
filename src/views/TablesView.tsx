import React, { useState } from 'react';
import {
  Grid3X3,
  Plus,
  Clock,
  UserCheck,
  CheckCircle,
  Coffee,
  Sparkles,
  Layers,
  Flame,
  Check,
  X,
  Trash2,
  QrCode,
  Bell,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { Table, Room } from '../types';
import { formatCurrency, formatElapsed, getElapsedMinutes } from '../utils/formatters';
import { TableQRModal } from '../components/TableQRModal';
import { ShiftHandoverModal } from '../components/ShiftHandoverModal';

interface TablesViewProps {
  state: AppState;
  onSelectTab: (tab: any) => void;
}

export const TablesView: React.FC<TablesViewProps> = ({ state, onSelectTab }) => {
  const { tables, rooms, comandas, currentUser, settings } = state;

  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [newTableModalOpen, setNewTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableRoomId, setNewTableRoomId] = useState(rooms[0]?.id || 'r-1');
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState<boolean>(false);

  const filteredTables = selectedRoomId === 'all'
    ? tables
    : tables.filter((t) => t.roomId === selectedRoomId);

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;

    const room = rooms.find((r) => r.id === newTableRoomId);
    const newTbl: Table = {
      id: `t-${Date.now()}`,
      number: newTableNumber.trim(),
      roomId: newTableRoomId,
      roomName: room?.name || 'Sala',
      capacity: newTableCapacity,
      status: 'livre',
      qrCodeToken: `sn-tbl-${Date.now().toString(36)}`,
    };

    store.saveTable(newTbl);
    setNewTableModalOpen(false);
    setNewTableNumber('');
  };

  const getStatusBadge = (status: Table['status']) => {
    switch (status) {
      case 'livre':
        return { label: 'Livre', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800' };
      case 'ocupada':
        return { label: 'Ocupada', color: 'bg-amber-950/60 text-amber-400 border-amber-700/60' };
      case 'conta_solicitada':
        return { label: 'Conta Solicitada', color: 'bg-orange-950/80 text-orange-400 border-orange-500 animate-pulse font-bold' };
      case 'a_aguardar_pagamento':
        return { label: 'Aguardar Pagamento', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-700' };
      case 'a_aguardar_limpeza':
        return { label: 'Aguardar Limpeza', color: 'bg-yellow-950/60 text-yellow-400 border-yellow-700/60' };
      case 'indisponivel':
        return { label: 'Indisponível', color: 'bg-stone-900 text-stone-500 border-stone-800' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filtro de Salas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-base font-bold text-white">Mapa de Mesas e Áreas</h1>
            <p className="text-xs text-stone-400">
              {tables.length} mesas configuradas • {tables.filter((t) => t.status === 'ocupada').length} ocupadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Abas de Salas */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setSelectedRoomId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRoomId === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Todas
            </button>
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoomId(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedRoomId === r.id
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShiftModalOpen(true)}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 flex items-center gap-1.5"
            title="Efetuar passagem de turno e transferência de mesas"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Passagem de Turno</span>
          </button>

          <button
            onClick={() => setNewTableModalOpen(true)}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nova Mesa
          </button>
        </div>
      </div>

      {/* Grelha de Mesas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const comanda = comandas.find((c) => c.id === table.activeComandaId);
          const badge = getStatusBadge(table.status);

          // Verificar atraso na preparação
          const hasDelayedRound = comanda?.rounds.some((r) => {
            const elapsed = getElapsedMinutes(r.createdAt);
            return (
              elapsed > (settings.expectedPrepTimeMinutes + settings.delayToleranceMinutes) &&
              r.items.some((i) => i.status === 'recebido' || i.status === 'em_preparacao')
            );
          });

          // Verificar prato pronto há mais tempo que o permitido por entregar
          const hasLateReady = comanda?.rounds.some((r) =>
            r.items.some(
              (i) =>
                i.status === 'pronto' &&
                getElapsedMinutes(i.statusUpdatedAt) > settings.readyDeliveryDelayMinutes
            )
          );

          // Verificar itens em preparação ou prontos
          const hasInPrep = comanda?.rounds.some((r) =>
            r.items.some((i) => i.status === 'recebido' || i.status === 'em_preparacao')
          );
          const hasReady = comanda?.rounds.some((r) =>
            r.items.some((i) => i.status === 'pronto')
          );

          return (
            <div
              key={table.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative ${
                table.activeCall
                  ? 'border-orange-500 bg-stone-900 ring-2 ring-orange-500/50 shadow-lg shadow-orange-950/40'
                  : hasDelayedRound
                  ? 'border-rose-600 bg-stone-900 ring-1 ring-rose-500 shadow-md shadow-rose-950/30'
                  : table.status === 'ocupada'
                  ? 'border-amber-700/60 bg-stone-900/90 shadow-md shadow-amber-950/20'
                  : table.status === 'conta_solicitada'
                  ? 'border-orange-500/80 bg-stone-900/90 shadow-md shadow-orange-950/30'
                  : table.status === 'a_aguardar_limpeza'
                  ? 'border-yellow-700/50 bg-stone-900/80'
                  : 'border-stone-800 bg-stone-950/60 hover:border-stone-700'
              }`}
            >
              {/* Header do Cartão com Número, Sala e Botão QR Code */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-base text-white">{table.number}</h3>
                    <button
                      onClick={() => setQrModalTable(table)}
                      className="p-1 hover:bg-stone-800 text-stone-400 hover:text-amber-400 rounded-lg transition-colors"
                      title="Ver e Imprimir QR Code da Mesa"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {table.roomName} • {table.capacity} lugares
                  </p>
                </div>

                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.color}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Chamada Ativa por QR Code do Cliente (Requisito 3) */}
              {table.activeCall && (
                <div className="bg-orange-950/90 border border-orange-600 p-2.5 rounded-xl text-xs space-y-1.5 shadow-md animate-pulse">
                  <div className="flex items-center justify-between text-orange-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-orange-400 animate-bounce" />
                      {table.activeCall.type === 'chamar_empregado' ? 'Chamar Empregado' : 'Pedir Conta'}
                    </span>
                    <span className="text-[10px] font-mono opacity-80">
                      {formatElapsed(table.activeCall.createdAt)}
                    </span>
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    {table.activeCall.status === 'solicitado' ? (
                      <button
                        onClick={() => store.acceptTableCall(table.activeCall!.id, currentUser)}
                        className="w-full py-1 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold rounded shadow transition-all"
                      >
                        Atender Chamada
                      </button>
                    ) : (
                      <button
                        onClick={() => store.completeTableCall(table.activeCall!.id)}
                        className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow transition-all"
                      >
                        Concluir Atendimento
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Informações da Comanda Ativa */}
              {table.status !== 'livre' && (
                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-stone-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-500" />
                      {table.waiterName || 'Sem empregado'}
                    </span>
                    <span>{table.guestCount || 2} pessoas</span>
                  </div>

                  <div className="flex justify-between items-center text-stone-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-500" />
                      {formatElapsed(table.openedAt)}
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {formatCurrency(comanda?.total || table.totalAmount || 0)}
                    </span>
                  </div>

                  {/* Badges de Cozinha / Bar e Alertas de Atraso */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {hasDelayedRound && (
                      <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-600 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> Atraso Cozinha
                      </span>
                    )}

                    {hasLateReady && (
                      <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-600 px-1.5 py-0.5 rounded font-bold animate-bounce flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-400" /> Pronto p/ Entregar
                      </span>
                    )}

                    {hasInPrep && !hasDelayedRound && (
                      <span className="text-[9px] bg-red-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" /> Na Cozinha
                      </span>
                    )}

                    {hasReady && !hasLateReady && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-600 px-1.5 py-0.5 rounded animate-pulse font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Pronto
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Ações Rápidas da Mesa */}
              <div className="flex items-center gap-2 pt-1 border-t border-stone-800/80">
                {table.status === 'a_aguardar_limpeza' ? (
                  <button
                    onClick={() => store.releaseTable(table.id)}
                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-stone-950 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Marcar como Limpa / Livre
                  </button>
                ) : table.status === 'livre' ? (
                  <button
                    onClick={() => {
                      store.openComanda(table.id, 2, currentUser);
                      onSelectTab('atendimento');
                    }}
                    className="w-full py-2 bg-stone-900 hover:bg-amber-600 text-stone-300 hover:text-white border border-stone-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    Abrir Comanda
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectTab('atendimento')}
                    className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    Abrir no Atendimento
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar Nova Mesa */}
      {newTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateTable}
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-sm text-white">Criar Nova Mesa</h3>
              <button
                type="button"
                onClick={() => setNewTableModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-400">Número ou Nome da Mesa:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mesa 7, Esplanada 15"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400">Área / Sala:</label>
                <select
                  value={newTableRoomId}
                  onChange={(e) => setNewTableRoomId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-stone-400">Capacidade (Lugares):</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(parseInt(e.target.value, 10) || 2)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setNewTableModalOpen(false)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Guardar Mesa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal QR Code da Mesa */}
      <TableQRModal
        table={qrModalTable}
        onClose={() => setQrModalTable(null)}
        onSelectTab={onSelectTab}
      />

      {/* Modal Passagem de Turno */}
      <ShiftHandoverModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        state={state}
      />
    </div>
  );
};
