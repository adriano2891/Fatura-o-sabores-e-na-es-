import React, { useState } from 'react';
import {
  ArrowRightLeft,
  X,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Bell,
  UtensilsCrossed,
  Shield,
  FileText,
} from 'lucide-react';
import { User, Table, Comanda } from '../types';
import { store, AppState } from '../services/storage';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const { users, tables, comandas, currentUser } = state;

  const waiters = users.filter((u) => u.role === 'waiter' || u.role === 'manager' || u.role === 'admin');

  const [outgoingId, setOutgoingId] = useState<string>(currentUser.id);
  const [incomingId, setIncomingId] = useState<string>(
    waiters.find((w) => w.id !== currentUser.id)?.id || waiters[0]?.id || ''
  );
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>(
    tables.filter((t) => (t.status === 'ocupada' || t.status === 'conta_solicitada') && t.waiterId === currentUser.id).map((t) => t.id)
  );
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [isManagerApproved, setIsManagerApproved] = useState<boolean>(currentUser.role === 'manager' || currentUser.role === 'admin');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  // Mesas ativas do empregado que sai
  const activeTablesOfOutgoing = tables.filter(
    (t) => (t.status === 'ocupada' || t.status === 'conta_solicitada') && t.waiterId === outgoingId
  );

  const activeComandasOfOutgoing = comandas.filter(
    (c) => selectedTableIds.includes(c.tableId) && c.status === 'aberta'
  );

  // Resumo do turno
  const preppingOrdersCount = activeComandasOfOutgoing.reduce(
    (acc, c) =>
      acc +
      c.rounds.reduce(
        (rAcc, r) =>
          rAcc + r.items.filter((i) => i.status === 'recebido' || i.status === 'em_preparacao').length,
        0
      ),
    0
  );

  const readyUndeliveredCount = activeComandasOfOutgoing.reduce(
    (acc, c) =>
      acc +
      c.rounds.reduce(
        (rAcc, r) => rAcc + r.items.filter((i) => i.status === 'pronto').length,
        0
      ),
    0
  );

  const activeAllergies = activeComandasOfOutgoing.flatMap((c) =>
    c.seats.flatMap((s) => s.allergies.map((a) => ({ table: c.tableName, seat: s.name || `Lugar ${s.seatNumber}`, allergy: a.name })))
  );

  const handleConfirmHandover = () => {
    if (!outgoingId || !incomingId) {
      alert('Selecione ambos os funcionários.');
      return;
    }

    if (outgoingId === incomingId) {
      alert('O empregado de saída e o que assume não podem ser a mesma pessoa.');
      return;
    }

    if (selectedTableIds.length === 0) {
      alert('Selecione pelo menos uma mesa para transferir.');
      return;
    }

    try {
      store.createShiftHandover({
        outgoingWaiterId: outgoingId,
        incomingWaiterId: incomingId,
        tableIds: selectedTableIds,
        notes: handoverNotes,
        isManagerOverride: isManagerApproved,
        user: currentUser,
      });

      setSuccessMsg('Turno e mesas transferidos com sucesso! Registado no diário operacional.');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Erro ao processar passagem de turno');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-100">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-white">Passagem de Turno entre Empregados</h2>
              <p className="text-xs text-stone-400">
                Transferência transparente de mesas, comandas, alertas de alergias e pedidos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Seleção de Funcionários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-stone-400 font-semibold">Empregado que está a sair:</label>
              <select
                value={outgoingId}
                onChange={(e) => {
                  setOutgoingId(e.target.value);
                  const matchingTables = tables
                    .filter((t) => (t.status === 'ocupada' || t.status === 'conta_solicitada') && t.waiterId === e.target.value)
                    .map((t) => t.id);
                  setSelectedTableIds(matchingTables);
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-white font-medium"
              >
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.avatar} {w.name} ({w.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-stone-400 font-semibold">Empregado que assume o turno:</label>
              <select
                value={incomingId}
                onChange={(e) => setIncomingId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-white font-medium"
              >
                {waiters
                  .filter((w) => w.id !== outgoingId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.avatar} {w.name} ({w.role})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Mesas a Transferir */}
          <div className="space-y-2">
            <label className="text-stone-300 font-bold flex items-center justify-between">
              <span>Mesas a transferir ({selectedTableIds.length} selecionadas):</span>
              <button
                type="button"
                onClick={() =>
                  setSelectedTableIds(activeTablesOfOutgoing.map((t) => t.id))
                }
                className="text-amber-400 hover:underline text-[11px]"
              >
                Selecionar todas
              </button>
            </label>

            {activeTablesOfOutgoing.length === 0 ? (
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-stone-500 italic text-center">
                O empregado selecionado não tem nenhuma mesa ativa neste momento.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeTablesOfOutgoing.map((tbl) => {
                  const isChecked = selectedTableIds.includes(tbl.id);
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setSelectedTableIds((prev) => prev.filter((id) => id !== tbl.id));
                        } else {
                          setSelectedTableIds((prev) => [...prev, tbl.id]);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'border-amber-500 bg-amber-500/20 text-white'
                          : 'border-stone-800 bg-stone-950 text-stone-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white">{tbl.number}</div>
                        <div className="text-[10px] text-stone-400">{tbl.roomName}</div>
                      </div>
                      <span className="w-4 h-4 rounded-full border border-amber-500 flex items-center justify-center text-[10px]">
                        {isChecked ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo do Turno Consolidado */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
            <div className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-800 pb-2">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Resumo Operacional a Transferir
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-850">
                <span className="text-[10px] text-stone-400">Em Preparação:</span>
                <div className="font-bold text-base text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {preppingOrdersCount} pedidos
                </div>
              </div>

              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-850">
                <span className="text-[10px] text-stone-400">Prontos por Entregar:</span>
                <div className="font-bold text-base text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {readyUndeliveredCount} pratos
                </div>
              </div>

              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-850">
                <span className="text-[10px] text-stone-400">Alergias Ativas:</span>
                <div className="font-bold text-base text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {activeAllergies.length} registadas
                </div>
              </div>
            </div>

            {/* Alergias destacadas */}
            {activeAllergies.length > 0 && (
              <div className="pt-2 border-t border-stone-800/80 space-y-1">
                <span className="text-[10px] font-bold text-rose-400 uppercase">
                  Atenção Especial: Alergias Ativas nestas Mesas:
                </span>
                <div className="space-y-1">
                  {activeAllergies.map((al, idx) => (
                    <div key={idx} className="text-[11px] text-stone-300">
                      • <strong>{al.table}</strong> ({al.seat}):{' '}
                      <span className="text-rose-300 font-semibold">{al.allergy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Observações do Turno */}
          <div className="space-y-1">
            <label className="text-stone-300 font-semibold">Observações para o próximo turno:</label>
            <textarea
              rows={2}
              placeholder="Ex: Mesa 3 aguarda sobremesa e pediu café descafeinado; Mesa 12 quer a conta dividida..."
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmHandover}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar e Assumir Turno
          </button>
        </div>
      </div>
    </div>
  );
};
