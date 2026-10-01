import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  ArrowDownUp,
  AlertTriangle,
  History,
  CheckCircle2,
  X,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { Product } from '../types';
import { formatDateTime } from '../utils/formatters';

interface StockViewProps {
  state: AppState;
}

export const StockView: React.FC<StockViewProps> = ({ state }) => {
  const { products, stockMovements, currentUser } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  const stockTrackedProducts = products.filter((p) => p.trackStock);

  const filteredProducts = stockTrackedProducts.filter((p) => {
    const isLow = p.stockQuantity <= p.minStockAlert;
    const matchesLow = filterLowStock ? isLow : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesLow && matchesSearch;
  });

  const handleOpenAdjust = (p: Product) => {
    setAdjustModalProduct(p);
    setNewStockQty(p.stockQuantity);
    setAdjustReason('Entrada de mercadoria / reposição de fornecedor');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    store.adjustStock({
      productId: adjustModalProduct.id,
      newStock: newStockQty,
      reason: adjustReason,
      user: currentUser,
    });

    setAdjustModalProduct(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-base font-bold text-white">Gestão e Controlo de Stock</h1>
            <p className="text-xs text-stone-400">
              {stockTrackedProducts.length} produtos monitorizados • Baixas automáticas nas rondas e reposições
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar produto ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 w-52"
            />
          </div>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filterLowStock
                ? 'bg-rose-950 text-rose-300 border-rose-600'
                : 'bg-stone-800 text-stone-300 border-stone-700 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Stock Baixo Apenas
          </button>
        </div>
      </div>

      {/* Grelha de Níveis de Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((p) => {
          const isLow = p.stockQuantity <= p.minStockAlert;
          const isCritical = p.stockQuantity === 0;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isCritical
                  ? 'border-rose-600/80 bg-stone-900/90 shadow-lg shadow-rose-950/20'
                  : isLow
                  ? 'border-amber-600/70 bg-stone-900/90'
                  : 'border-stone-800 bg-stone-900'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="text-[10px] text-stone-500 font-mono">{p.code}</div>
                  <span
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      isCritical
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : isLow
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    {isCritical ? 'Esgotado' : isLow ? 'Stock Baixo' : 'Em Stock'}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-white mt-1 line-clamp-1">{p.name}</h3>
                <p className="text-[11px] text-stone-400 mt-0.5">Alerta mínimo: {p.minStockAlert} un.</p>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400">Quantidade Atual:</span>
                  <div className="font-mono text-xl font-black text-white">{p.stockQuantity} un.</div>
                </div>

                <button
                  onClick={() => handleOpenAdjust(p)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg flex items-center gap-1 border border-stone-700 transition-colors"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  Ajustar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Histórico Recente de Movimentos de Stock */}
      <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
          <History className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300">
            Últimos Movimentos de Stock e Auditoria
          </h2>
        </div>

        {stockMovements.length === 0 ? (
          <div className="text-center py-6 text-stone-500 text-xs italic">
            Nenhum movimento de stock registado ainda.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {stockMovements.slice(0, 10).map((mov) => (
              <div
                key={mov.id}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-850 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white">{mov.productName}</span>
                  <div className="text-[10px] text-stone-400">
                    {mov.reason} • por {mov.userName} às {formatDateTime(mov.date)}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span
                    className={`font-bold ${
                      mov.type === 'entrada' || mov.type === 'retorno_cancelamento'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {mov.type === 'entrada' || mov.type === 'retorno_cancelamento' ? '+' : '-'}
                    {mov.quantity} un.
                  </span>
                  <div className="text-[10px] text-stone-500">
                    {mov.previousStock} → {mov.newStock}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajustar Stock */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveAdjustment}
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">Ajuste de Stock</h3>
                <p className="text-xs text-stone-400">{adjustModalProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalProduct(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400">Stock Atual em Sistema:</span>
                <span className="font-mono text-base font-bold text-white">
                  {adjustModalProduct.stockQuantity} un.
                </span>
              </div>

              <div>
                <label className="text-stone-400">Nova Quantidade Contada / Ajustada:</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-base font-mono text-white mt-1"
                />
              </div>

              <div>
                <label className="text-stone-400">Motivo do Ajuste (Obrigatório):</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contagem física, mercadoria danificada, entrada..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setAdjustModalProduct(null)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Guardar Ajuste
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
