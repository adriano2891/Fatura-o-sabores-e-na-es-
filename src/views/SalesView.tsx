import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  FileCheck2,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  DollarSign,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { Sale } from '../types';
import { formatCurrency, formatDateTime, formatTime } from '../utils/formatters';

interface SalesViewProps {
  state: AppState;
  onViewReceipt: (doc: any) => void;
  onSelectTab: (tab: any) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ state, onViewReceipt, onSelectTab }) => {
  const { sales, fiscalDocuments, currentUser } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'paga' | 'aberta'>('todos');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter((s) => {
    const matchesStatus = statusFilter === 'todos' || s.status === statusFilter;
    const matchesQuery = searchQuery
      ? s.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.customerNif && s.customerNif.includes(searchQuery))
      : true;
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-base font-bold text-white">Histórico e Gestão de Vendas</h1>
            <p className="text-xs text-stone-400">
              {sales.length} vendas registadas • Ligação direta com comandas e faturação certificada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar venda, mesa ou NIF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 w-56"
            />
          </div>

          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === 'todos' ? 'bg-amber-600 text-white' : 'text-stone-400'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('paga')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === 'paga' ? 'bg-amber-600 text-white' : 'text-stone-400'
              }`}
            >
              Pagas
            </button>
            <button
              onClick={() => setStatusFilter('aberta')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === 'aberta' ? 'bg-amber-600 text-white' : 'text-stone-400'
              }`}
            >
              Em Aberto
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 border-b border-stone-800 uppercase text-[10px] tracking-wider text-stone-400">
              <tr>
                <th className="px-4 py-3">ID Venda / Comanda</th>
                <th className="px-4 py-3">Mesa & Sala</th>
                <th className="px-4 py-3">Data e Hora</th>
                <th className="px-4 py-3">Empregado</th>
                <th className="px-4 py-3">Cliente / NIF</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado Venda</th>
                <th className="px-4 py-3 text-center">Estado Fiscal</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-500 italic">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const doc = fiscalDocuments.find((d) => d.id === sale.documentId || d.saleId === sale.id);

                  return (
                    <tr key={sale.id} className="hover:bg-stone-850 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        {sale.id}
                        <div className="text-[10px] text-stone-500 font-normal">{sale.comandaId}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-white">{sale.tableName}</span>
                        <div className="text-[10px] text-stone-400">{sale.roomName}</div>
                      </td>

                      <td className="px-4 py-3 font-mono text-stone-400">
                        {formatDateTime(sale.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-stone-300">{sale.waiterName}</td>

                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{sale.customerName || 'Consumidor Final'}</div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {sale.customerNif || '999999990'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-400 text-sm">
                        {formatCurrency(sale.total)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                            sale.status === 'paga'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                              : sale.status === 'parcialmente_paga'
                              ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                              : 'bg-stone-800 text-stone-300 border-stone-700'
                          }`}
                        >
                          {sale.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                            sale.fiscalStatus === 'comunicada_at' || sale.fiscalStatus === 'emitida'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {sale.fiscalStatus === 'comunicada_at'
                            ? 'Comunicada AT'
                            : sale.fiscalStatus === 'emitida'
                            ? 'Emitida'
                            : 'Não Emitida'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                          title="Ver detalhes da venda"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {doc && (
                          <button
                            onClick={() => onViewReceipt(doc)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 transition-colors"
                            title="Ver Fatura / Recibo Certificado"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes da Venda */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl p-5 space-y-4 text-stone-100 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Detalhe da Venda: {selectedSale.id}</h3>
                <p className="text-xs text-stone-400">
                  {selectedSale.tableName} • {selectedSale.roomName} • {formatDateTime(selectedSale.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Linhas de Itens da Venda */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-300">Itens Consumidos:</span>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 divide-y divide-stone-850 text-xs">
                {selectedSale.items.map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                      <span>{it.productName}</span>
                      <span className="text-[10px] text-stone-500 ml-1.5">
                        (IVA {(it.vatRate * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-stone-200">
                      {formatCurrency(it.totalItemPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico de Pagamentos */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-300">Pagamentos Registados:</span>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs space-y-2">
                {selectedSale.payments.length === 0 ? (
                  <div className="text-stone-500 italic">Nenhum pagamento registado nesta venda.</div>
                ) : (
                  selectedSale.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center">
                      <div>
                        <span className="font-bold uppercase text-white">{p.method}</span>
                        <span className="text-[10px] text-stone-400 ml-2">
                          por {p.registeredByName} às {formatTime(p.timestamp)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totais */}
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal (sem IVA):</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Total IVA:</span>
                <span>{formatCurrency(selectedSale.taxTotal)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base text-white pt-1 border-t border-stone-800">
                <span>Total da Venda:</span>
                <span className="font-mono text-amber-400">{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
