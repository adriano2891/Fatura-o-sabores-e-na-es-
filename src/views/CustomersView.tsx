import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  FileCheck2,
  DollarSign,
  X,
  Check,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { Customer } from '../types';
import { formatCurrency, formatDateTime, validatePortugueseNIF } from '../utils/formatters';

interface CustomersViewProps {
  state: AppState;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ state }) => {
  const { customers, sales } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [modalCustomer, setModalCustomer] = useState<Customer | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [formName, setFormName] = useState('');
  const [formNif, setFormNif] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [nifError, setNifError] = useState('');

  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nif.includes(searchQuery) ||
      (c.phone && c.phone.includes(searchQuery))
    );
  });

  const handleOpenCreate = () => {
    setIsNew(true);
    setFormName('');
    setFormNif('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setNifError('');
    setModalCustomer({} as Customer);
  };

  const handleOpenEdit = (c: Customer) => {
    setIsNew(false);
    setFormName(c.name);
    setFormNif(c.nif);
    setFormEmail(c.email || '');
    setFormPhone(c.phone || '');
    setFormAddress(c.address || '');
    setNifError('');
    setModalCustomer(c);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    if (formNif && formNif !== '999999990') {
      const check = validatePortugueseNIF(formNif);
      if (!check.valid) {
        setNifError(check.message || 'NIF inválido para Portugal');
        return;
      }
    }

    const newCustomer: Customer = {
      id: isNew ? `c-${Date.now()}` : modalCustomer!.id,
      name: formName.trim(),
      nif: formNif.trim() || '999999990',
      email: formEmail.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      totalSpent: isNew ? 0 : modalCustomer!.totalSpent,
      visitCount: isNew ? 0 : modalCustomer!.visitCount,
      lastVisit: isNew ? new Date().toISOString() : modalCustomer!.lastVisit,
      cashbackBalance: isNew ? 0 : modalCustomer!.cashbackBalance || 0,
      cashbackMovements: isNew ? [] : modalCustomer!.cashbackMovements || [],
      mealPlans: isNew ? [] : modalCustomer!.mealPlans || [],
    };

    store.saveCustomer(newCustomer);
    setModalCustomer(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-base font-bold text-white">Base de Clientes & NIFs</h1>
            <p className="text-xs text-stone-400">
              {customers.length} clientes registados • Faturação personalizada e histórico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar cliente ou NIF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 w-56"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Grelha de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const clientSales = sales.filter((s) => s.customerNif === cust.nif);
          const totalSpent = clientSales.reduce((acc, s) => acc + s.paidAmount, 0) || cust.totalSpent;

          return (
            <div
              key={cust.id}
              className="p-4 rounded-2xl border border-stone-800 bg-stone-900 hover:border-amber-600/50 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{cust.name}</h3>
                    <div className="text-xs text-amber-400 font-mono mt-0.5">NIF: {cust.nif}</div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(cust)}
                    className="text-xs text-stone-400 hover:text-white px-2 py-1 bg-stone-800 rounded"
                  >
                    Editar
                  </button>
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-stone-400">
                  {cust.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-500" />
                      <span>{cust.phone}</span>
                    </div>
                  )}
                  {cust.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-500" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                  )}
                  {cust.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                <span className="text-stone-400">Total Consumido:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {formatCurrency(totalSpent)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar/Editar Cliente */}
      {modalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                {isNew ? 'Novo Cliente' : `Editar: ${formName}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalCustomer(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400">Nome Completo / Denominação Social:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-stone-400">NIF (Número de Identificação Fiscal):</label>
                <input
                  type="text"
                  maxLength={9}
                  required
                  placeholder="Ex: 501234564 ou 999999990"
                  value={formNif}
                  onChange={(e) => {
                    setFormNif(e.target.value);
                    setNifError('');
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white font-mono mt-1"
                />
                {nifError && <p className="text-[10px] text-rose-400 mt-1">{nifError}</p>}
              </div>

              <div>
                <label className="text-stone-400">Email:</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-stone-400">Telefone / Telemóvel:</label>
                <input
                  type="tel"
                  placeholder="+351 9..."
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-stone-400">Morada Fiscal Completa:</label>
                <input
                  type="text"
                  placeholder="Rua, Código Postal, Cidade..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setModalCustomer(null)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
