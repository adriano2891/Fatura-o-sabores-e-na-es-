import React, { useState } from 'react';
import {
  Globe,
  Search,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  Flame,
  Truck,
  ShoppingBag,
  CreditCard,
  FileCheck2,
  User,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { OnlineOrder } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface OnlineOrdersViewProps {
  state: AppState;
  onViewReceipt: (doc: any) => void;
}

export const OnlineOrdersView: React.FC<OnlineOrdersViewProps> = ({ state, onViewReceipt }) => {
  const { onlineOrders, currentUser, fiscalDocuments } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'entrega' | 'levantamento'>('todos');

  const filteredOrders = onlineOrders.filter((o) => {
    const matchesType = filterType === 'todos' || o.deliveryType === filterType;
    const matchesSearch = searchQuery
      ? o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerNif.includes(searchQuery)
      : true;
    return matchesType && matchesSearch;
  });

  const handleAcceptOrder = (orderId: string) => {
    store.acceptOnlineOrder(orderId, currentUser);
  };

  const handleUpdateStatus = (orderId: string, status: OnlineOrder['prepStatus']) => {
    store.updateOnlineOrderPrep(orderId, status);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-base font-bold text-white">Pedidos do Site (Takeaway & Entrega)</h1>
            <p className="text-xs text-stone-400">
              {onlineOrders.length} encomendas online sincronizadas • Integração com cozinha, bar e faturação
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar pedido, cliente ou NIF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 w-56"
            />
          </div>

          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterType === 'todos' ? 'bg-amber-600 text-white' : 'text-stone-400'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('entrega')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterType === 'entrega' ? 'bg-amber-600 text-white' : 'text-stone-400'
              }`}
            >
              Entregas
            </button>
            <button
              onClick={() => setFilterType('levantamento')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterType === 'levantamento' ? 'bg-amber-600 text-white' : 'text-stone-400'
              }`}
            >
              Takeaway
            </button>
          </div>
        </div>
      </div>

      {/* Grelha de Pedidos Online */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="lg:col-span-2 p-12 bg-stone-900/60 rounded-2xl border border-dashed border-stone-800 text-center text-stone-500 text-xs italic">
            Nenhum pedido online encontrado.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isDelivery = order.deliveryType === 'entrega';
            const isPaidOnline = order.paymentStatus === 'pago_online';

            return (
              <div
                key={order.id}
                className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-4 shadow-xl hover:border-amber-600/40 transition-all flex flex-col justify-between"
              >
                {/* Header do Pedido */}
                <div className="flex items-start justify-between border-b border-stone-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white font-mono">{order.id}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isDelivery
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {isDelivery ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                        {isDelivery ? 'Entrega ao Domicílio' : 'Levantamento no Restaurante'}
                      </span>
                    </div>

                    <div className="text-xs text-stone-300 font-semibold mt-1">
                      {order.customerName} • Tel: {order.customerPhone}
                    </div>
                    {isDelivery && order.deliveryAddress && (
                      <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                        <span className="truncate">{order.deliveryAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-base font-extrabold text-amber-400">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Hora solicitada: <strong className="text-white">{order.requestedTime}</strong>
                    </div>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="space-y-1.5 text-xs bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Itens Encomendados:</span>
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-stone-200 py-0.5">
                      <div>
                        <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                        <span>{it.productName}</span>
                        {it.notes && (
                          <span className="text-[10px] text-amber-400 ml-1 italic">({it.notes})</span>
                        )}
                      </div>
                      <span className="font-mono text-stone-400 font-semibold">
                        {formatCurrency(it.totalItemPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Informação Fiscal e de Pagamento */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-850">
                    <span className="text-[10px] text-stone-400">Pagamento:</span>
                    <div className="font-semibold text-white mt-0.5 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{order.paymentMethod}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                      {isPaidOnline ? 'Liquidado Online (Sem cobrar em caixa)' : 'A cobrar na entrega'}
                    </div>
                  </div>

                  <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-850">
                    <span className="text-[10px] text-stone-400">Documento Fiscal:</span>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {order.documentNumber || 'Emitido pelo Site'}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">NIF: {order.customerNif}</div>
                  </div>
                </div>

                {/* Ações de Estado de Preparação */}
                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-stone-800 text-stone-300">
                    Estado: {order.prepStatus.replace(/_/g, ' ')}
                  </span>

                  <div className="flex gap-1.5">
                    {order.prepStatus === 'recebido' && (
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        Aceitar e Enviar à Cozinha
                      </button>
                    )}

                    {order.prepStatus === 'em_preparacao' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'pronto')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Marcar como Pronto
                      </button>
                    )}

                    {order.prepStatus === 'pronto' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'entregue')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Concluir Entrega / Levantamento
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
