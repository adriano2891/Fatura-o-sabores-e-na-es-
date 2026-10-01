import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Grid3X3,
  Clock,
  Flame,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Coffee,
  Wallet,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { formatCurrency, formatTime, getElapsedMinutes } from '../utils/formatters';

interface DashboardViewProps {
  state: AppState;
  onSelectTab: (tab: any) => void;
  onViewReceipt: (doc: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ state, onSelectTab, onViewReceipt }) => {
  const { sales, tables, comandas, cashSessions, currentCashSessionId, fiscalDocuments } = state;

  // Sessão atual de caixa
  const currentCash = cashSessions.find((s) => s.id === currentCashSessionId && s.status === 'aberto');

  // Cálculos do dia
  const todaySales = sales;
  const totalSalesGross = todaySales.reduce((acc, s) => acc + s.total, 0);
  const totalReceivedCashAndCard = todaySales.reduce((acc, s) => acc + s.paidAmount, 0);

  const activeComandas = comandas.filter((c) => c.status === 'aberta' || c.status === 'conta_solicitada');
  const occupiedTables = tables.filter((t) => t.status === 'ocupada' || t.status === 'conta_solicitada');
  const waitingPayment = tables.filter((t) => t.status === 'conta_solicitada' || t.status === 'a_aguardar_pagamento');

  // Itens em preparação na cozinha e bar
  const inPrepItemsCount = comandas.reduce((acc, c) => {
    return (
      acc +
      c.rounds.reduce((rAcc, r) => {
        return rAcc + r.items.filter((i) => i.status === 'recebido' || i.status === 'em_preparacao').length;
      }, 0)
    );
  }, 0);

  // Itens prontos a aguardar entrega pelo empregado
  const readyItemsCount = comandas.reduce((acc, c) => {
    return (
      acc +
      c.rounds.reduce((rAcc, r) => {
        return rAcc + r.items.filter((i) => i.status === 'pronto').length;
      }, 0)
    );
  }, 0);

  // Faturas pendentes de comunicação
  const pendingInvoices = sales.filter((s) => s.status === 'paga' && s.fiscalStatus !== 'comunicada_at');

  return (
    <div className="space-y-6">
      {/* Top Banner de Boas-Vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 p-5 rounded-2xl border border-stone-800">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Painel Operacional Sabores & Nações</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Visão consolidada em tempo real • Turno aberto por {currentCash?.openedByName || 'Caixa'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('atendimento')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Coffee className="w-4 h-4" />
            Nova Comanda de Mesa
          </button>
          <button
            onClick={() => onSelectTab('cozinha')}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-all flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            Ecrã Cozinha
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendas do Dia */}
        <div className="bg-stone-900/90 p-4 rounded-xl border border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-medium">Total em Vendas</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-white font-mono">
            {formatCurrency(totalSalesGross)}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/80">
            <span>Recebido Efetivo:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {formatCurrency(totalReceivedCashAndCard)}
            </span>
          </div>
        </div>

        {/* Mesas e Comandas Abertas */}
        <div className="bg-stone-900/90 p-4 rounded-xl border border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-medium">Mesas Ocupadas</span>
            <Grid3X3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-white font-mono flex items-baseline gap-2">
            <span>{occupiedTables.length}</span>
            <span className="text-xs font-normal text-stone-400">/ {tables.length} mesas</span>
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/80">
            <span>Comandas ativas:</span>
            <span className="font-bold text-amber-400">{activeComandas.length}</span>
          </div>
        </div>

        {/* Cozinha e Bar */}
        <div className="bg-stone-900/90 p-4 rounded-xl border border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-medium">Pedidos na Cozinha</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-white font-mono flex items-baseline gap-2">
            <span className={inPrepItemsCount > 0 ? 'text-rose-400' : 'text-stone-300'}>
              {inPrepItemsCount}
            </span>
            <span className="text-xs font-normal text-stone-400">em preparação</span>
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/80">
            <span>Prontos a entregar:</span>
            <span className={`font-bold ${readyItemsCount > 0 ? 'text-emerald-400 font-mono animate-pulse' : 'text-stone-400'}`}>
              {readyItemsCount} pratos
            </span>
          </div>
        </div>

        {/* Caixa e Faturação */}
        <div className="bg-stone-900/90 p-4 rounded-xl border border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-medium">Caixa & Faturas</span>
            <Wallet className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-white font-mono">
            {formatCurrency(currentCash?.currentFloat || 0)}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/80">
            <span>Faturas emitidas:</span>
            <span className="font-bold text-teal-400">{fiscalDocuments.length} docs</span>
          </div>
        </div>
      </div>

      {/* Grid com Mesas Ativas & Vendas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mesas com Atendimento em Curso (2 colunas) */}
        <div className="lg:col-span-2 bg-stone-900/90 p-5 rounded-2xl border border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-white">Mesas em Atendimento Ativo</h2>
            </div>
            <button
              onClick={() => onSelectTab('mesas')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Ver Todas as Mesas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {occupiedTables.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-xs">
              Todas as mesas estão livres no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {occupiedTables.map((table) => {
                const comanda = comandas.find((c) => c.id === table.activeComandaId);
                const elapsedMins = getElapsedMinutes(table.openedAt);
                const isUrgent = elapsedMins > 45;

                return (
                  <div
                    key={table.id}
                    onClick={() => onSelectTab('atendimento')}
                    className="p-3.5 rounded-xl border border-stone-800 bg-stone-950/60 hover:border-amber-500/50 cursor-pointer transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{table.number}</span>
                          <span className="text-[10px] text-stone-400 font-normal">
                            ({table.roomName})
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {table.waiterName || 'Sem empregado'} • {table.guestCount || 2} pax
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          table.status === 'conta_solicitada'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {table.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800/80">
                      <div className="flex items-center gap-1 text-stone-400 text-[11px]">
                        <Clock className={`w-3 h-3 ${isUrgent ? 'text-rose-400' : 'text-stone-400'}`} />
                        <span className={isUrgent ? 'text-rose-400 font-bold' : ''}>
                          {elapsedMins} min
                        </span>
                      </div>

                      <div className="font-mono font-bold text-amber-400">
                        {formatCurrency(comanda?.total || table.totalAmount || 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Faturas Recentes & Auditoria */}
        <div className="bg-stone-900/90 p-5 rounded-2xl border border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Últimas Faturas Emitidas</h2>
            </div>
            <button
              onClick={() => onSelectTab('faturas')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Ver Faturas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {fiscalDocuments.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-xs">
              Ainda não foram emitidas faturas neste turno.
            </div>
          ) : (
            <div className="space-y-2.5">
              {fiscalDocuments.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onViewReceipt(doc)}
                  className="p-3 rounded-xl border border-stone-800 bg-stone-950/60 hover:bg-stone-800/40 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-white">{doc.series}</div>
                    <div className="text-[11px] text-stone-400">
                      {doc.customerName} ({doc.customerNif})
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      {formatTime(doc.issuedAt)} • ATCUD: {doc.atcud}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-xs text-stone-100">
                      {formatCurrency(doc.grossTotal)}
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      {doc.status === 'comunicada_at' ? 'AT OK' : 'Emitida'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
