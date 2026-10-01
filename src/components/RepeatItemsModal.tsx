import React, { useState } from 'react';
import {
  RotateCcw,
  X,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Send,
  UtensilsCrossed,
} from 'lucide-react';
import { Comanda, OrderItem, Product } from '../types';
import { store, AppState } from '../services/storage';
import { formatCurrency } from '../utils/formatters';

interface RepeatItemsModalProps {
  comanda: Comanda | null;
  onClose: () => void;
  state: AppState;
}

export const RepeatItemsModal: React.FC<RepeatItemsModalProps> = ({
  comanda,
  onClose,
  state,
}) => {
  const { products, currentUser } = state;

  if (!comanda) return null;

  // Itens únicos das rondas anteriores válidos para repetição (exclui cancelados)
  const previousItems = comanda.rounds
    .flatMap((r) => r.items)
    .filter((i) => i.status !== 'cancelado');

  // Mapeamento de seleção
  const [selectedItems, setSelectedItems] = useState<
    {
      originalItem: OrderItem;
      quantity: number;
      seatNumber?: number;
      notes: string;
      product: Product;
    }[]
  >([]);

  // Inicializa itens disponíveis
  const availableToSelect = previousItems.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    return { item, prod };
  });

  const isItemSelected = (itemId: string) =>
    selectedItems.some((s) => s.originalItem.id === itemId);

  const toggleItemSelection = (item: OrderItem, prod?: Product) => {
    if (!prod) return;
    if (isItemSelected(item.id)) {
      setSelectedItems((prev) => prev.filter((s) => s.originalItem.id !== item.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          originalItem: item,
          quantity: item.quantity,
          seatNumber: item.seatNumber,
          notes: item.notes,
          product: prod,
        },
      ]);
    }
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((s) => {
        if (s.originalItem.id === itemId) {
          const newQty = Math.max(1, s.quantity + delta);
          return { ...s, quantity: newQty };
        }
        return s;
      })
    );
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setSelectedItems((prev) =>
      prev.map((s) => (s.originalItem.id === itemId ? { ...s, notes } : s))
    );
  };

  const handleUpdateSeat = (itemId: string, seatNumber?: number) => {
    setSelectedItems((prev) =>
      prev.map((s) => (s.originalItem.id === itemId ? { ...s, seatNumber } : s))
    );
  };

  const handleConfirmRepeat = () => {
    if (selectedItems.length === 0) return;

    try {
      const itemsToDispatch = selectedItems.map((s) => ({
        productId: s.product.id,
        quantity: s.quantity,
        seatNumber: s.seatNumber,
        notes: s.notes,
      }));

      store.repeatOrderItems(comanda.id, itemsToDispatch, currentUser);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao repetir itens');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-100">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-white">Repetir Itens de Rondas Anteriores</h2>
              <p className="text-xs text-stone-400">
                {comanda.tableName} • Selecione produtos para preparar uma nova ronda com revisão prévia
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <p className="text-stone-300">
            Selecione quais itens anteriores deseja repetir para esta mesa. Poderá ajustar a quantidade, rever o lugar e verificar alérgenos antes de enviar à cozinha:
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {availableToSelect.map(({ item, prod }, idx) => {
              if (!prod) return null;
              const isSelected = isItemSelected(item.id);
              const selectedConfig = selectedItems.find((s) => s.originalItem.id === item.id);
              const isOutOfStock = prod.trackStock && prod.stockQuantity <= 0;

              return (
                <div
                  key={`${item.id}-${idx}`}
                  className={`p-3 rounded-xl border transition-all space-y-2 ${
                    isOutOfStock
                      ? 'border-stone-800/60 bg-stone-950/40 opacity-50'
                      : isSelected
                      ? 'border-amber-500 bg-amber-500/15 shadow-md'
                      : 'border-stone-800 bg-stone-950/80 hover:bg-stone-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      disabled={isOutOfStock || !prod.available}
                      onClick={() => toggleItemSelection(item, prod)}
                      className="flex-1 text-left flex items-start gap-2.5"
                    >
                      <span
                        className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center font-bold text-[10px] ${
                          isSelected ? 'bg-amber-600 border-amber-500 text-white' : 'border-stone-700'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{prod.name}</div>
                        <div className="text-[11px] text-stone-400">
                          Preço unitário: {formatCurrency(prod.price)} • Setor: {prod.sector}
                        </div>
                        {item.seatName && (
                          <div className="text-[10px] text-amber-400">Lugar original: {item.seatName}</div>
                        )}
                        {isOutOfStock && (
                          <div className="text-[10px] text-rose-400 font-semibold">Esgotado no stock</div>
                        )}
                      </div>
                    </button>

                    {isSelected && selectedConfig && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-7 h-7 rounded bg-stone-800 text-white font-bold flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-sm px-1">
                          {selectedConfig.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-7 h-7 rounded bg-stone-800 text-white font-bold flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edição de Lugar e Observações se selecionado */}
                  {isSelected && selectedConfig && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-stone-800/80">
                      <div>
                        <label className="text-[10px] text-stone-400">Atribuir a Lugar / Pessoa:</label>
                        <select
                          value={selectedConfig.seatNumber || ''}
                          onChange={(e) =>
                            handleUpdateSeat(
                              item.id,
                              e.target.value ? parseInt(e.target.value, 10) : undefined
                            )
                          }
                          className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-white mt-0.5"
                        >
                          <option value="">Para partilhar</option>
                          {comanda.seats.map((s) => (
                            <option key={s.seatNumber} value={s.seatNumber}>
                              Lugar {s.seatNumber}{s.name ? `: ${s.name}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-stone-400">Rever Observações:</label>
                        <input
                          type="text"
                          value={selectedConfig.notes}
                          onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                          placeholder="Ex: sem cebola, bem passado..."
                          className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-white mt-0.5"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumo antes de Enviar */}
          {selectedItems.length > 0 && (
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
              <div className="flex justify-between font-bold text-white">
                <span>Total dos Itens a Repetir:</span>
                <span className="font-mono text-amber-400">
                  {formatCurrency(
                    selectedItems.reduce((sum, s) => sum + s.product.price * s.quantity, 0)
                  )}
                </span>
              </div>
              <div className="text-[11px] text-stone-400">
                Uma nova ronda #{comanda.rounds.length + 1} será gerada e enviada para preparação.
              </div>
            </div>
          )}
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
            disabled={selectedItems.length === 0}
            onClick={handleConfirmRepeat}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <Send className="w-4 h-4" />
            Confirmar e Enviar Nova Ronda
          </button>
        </div>
      </div>
    </div>
  );
};
