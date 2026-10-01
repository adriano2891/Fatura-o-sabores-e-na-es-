import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flame,
  Wine,
  Cake,
  Boxes,
  Tag,
  X,
  Check,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { Product, Category, PrepSector } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MenuViewProps {
  state: AppState;
}

export const MenuView: React.FC<MenuViewProps> = ({ state }) => {
  const { products, categories, currentUser } = state;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Form fields
  const [formData, setFormData] = useState<Partial<Product>>({});

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCat && matchesSearch;
  });

  const handleOpenCreate = () => {
    setIsNewProduct(true);
    setFormData({
      id: `p-${Date.now()}`,
      code: `PRD-${Date.now().toString().slice(-4)}`,
      name: '',
      description: '',
      categoryId: categories[0]?.id || 'cat-1',
      price: 10.0,
      vatRate: 0.13,
      sector: 'cozinha',
      available: true,
      isFavorite: false,
      variants: [],
      extras: [],
      allowedNotes: ['Sem sal', 'Bem passado'],
      allergens: [],
      trackStock: false,
      stockQuantity: 50,
      minStockAlert: 10,
    });
    setEditingProduct({} as Product);
  };

  const handleOpenEdit = (p: Product) => {
    setIsNewProduct(false);
    setFormData({ ...p });
    setEditingProduct(p);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    store.saveProduct(formData as Product);
    setEditingProduct(null);
  };

  const handleToggleAvailable = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    store.toggleProductAvailability(productId);
  };

  const commonAllergens = [
    'Glúten',
    'Crustáceos',
    'Ovos',
    'Peixe',
    'Amendoins',
    'Soja',
    'Lacticínios',
    'Frutos secos',
    'Aipo',
    'Mostarda',
    'Sésamo',
    'Sulfitos',
    'Tremoço',
    'Moluscos',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-base font-bold text-white">Cardápio & Catálogo de Produtos</h1>
            <p className="text-xs text-stone-400">
              {products.length} itens cadastrados • Preços, taxas de IVA, setores e alérgenos
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
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Categorias */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategoryId === 'all'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
          }`}
        >
          Todas as Categorias
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategoryId === cat.id
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Grelha de Produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((p) => {
          const cat = categories.find((c) => c.id === p.categoryId);
          const isOutOfStock = p.trackStock && p.stockQuantity <= 0;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                !p.available || isOutOfStock
                  ? 'border-stone-850 bg-stone-950/70 opacity-70'
                  : 'border-stone-800 bg-stone-900 hover:border-amber-600/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="text-[10px] text-stone-500 font-mono">{p.code}</div>
                    <h3 className="font-extrabold text-sm text-white line-clamp-1">{p.name}</h3>
                  </div>

                  {/* Toggle Rápido Disponível / Esgotado */}
                  <button
                    onClick={(e) => handleToggleAvailable(p.id, e)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                      p.available && !isOutOfStock
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                    }`}
                    title="Alternar disponibilidade imediata no restaurante"
                  >
                    {p.available && !isOutOfStock ? 'Disponível' : 'Esgotado'}
                  </button>
                </div>

                <p className="text-[11px] text-stone-400 line-clamp-2 mt-1.5 leading-snug">
                  {p.description}
                </p>

                {/* Tags de Alérgenos */}
                {p.allergens.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.allergens.map((a, i) => (
                      <span
                        key={i}
                        className="text-[9px] bg-stone-800 text-stone-300 px-1.5 py-0.2 rounded"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Informações Fiscais, Setor e Preço */}
              <div className="pt-2 border-t border-stone-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span className="flex items-center gap-1 font-mono uppercase">
                    {p.sector === 'cozinha' ? (
                      <Flame className="w-3 h-3 text-orange-400" />
                    ) : p.sector === 'bar' ? (
                      <Wine className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Cake className="w-3 h-3 text-amber-400" />
                    )}
                    {p.sector}
                  </span>

                  <span className="font-mono text-stone-300">
                    IVA {(p.vatRate * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-base text-amber-400">
                    {formatCurrency(p.price)}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                      title="Editar produto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Pretende eliminar o produto "${p.name}"?`)) {
                          store.deleteProduct(p.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition-colors"
                      title="Eliminar produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar / Editar Produto */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveProduct}
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-stone-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                {isNewProduct ? 'Novo Produto no Cardápio' : `Editar: ${formData.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400">Código Interno:</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white font-mono mt-1"
                  />
                </div>

                <div>
                  <label className="text-stone-400">Categoria:</label>
                  <select
                    value={formData.categoryId || 'cat-1'}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white mt-1"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-stone-400">Nome do Prato / Produto:</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-stone-400">Descrição Gastronómica:</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-stone-400">Preço com IVA (€):</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={formData.price || 0}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white font-mono mt-1"
                  />
                </div>

                <div>
                  <label className="text-stone-400">Taxa de IVA (PT):</label>
                  <select
                    value={formData.vatRate !== undefined ? formData.vatRate : 0.13}
                    onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white mt-1"
                  >
                    <option value={0.23}>23% (Normal / Bebidas)</option>
                    <option value={0.13}>13% (Intermédia / Refeições)</option>
                    <option value={0.06}>6% (Reduzida / Pão e Água)</option>
                    <option value={0.0}>0% (Isento Art. 9º)</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-400 font-bold">Setor Responsável (Obrigatório):</label>
                  <select
                    required
                    value={formData.sector || 'cozinha'}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value as PrepSector })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white mt-1 font-semibold"
                  >
                    <option value="cozinha">Cozinha / Copa</option>
                    <option value="bar">Bar (Bebidas)</option>
                    <option value="atendimento">Entrega direta pelo Atendimento</option>
                    <option value="pastelaria">Pastelaria / Sobremesas</option>
                  </select>
                </div>
              </div>

              {/* Alérgenos */}
              <div>
                <label className="text-stone-400">Alérgenos Presentes:</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-24 overflow-y-auto p-2 bg-stone-950 rounded-lg border border-stone-800">
                  {commonAllergens.map((alg) => {
                    const isChecked = formData.allergens?.includes(alg);
                    return (
                      <button
                        type="button"
                        key={alg}
                        onClick={() => {
                          const current = formData.allergens || [];
                          const updated = isChecked
                            ? current.filter((x) => x !== alg)
                            : [...current, alg];
                          setFormData({ ...formData, allergens: updated });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isChecked
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-stone-900 text-stone-400 border-stone-800'
                        }`}
                      >
                        {alg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controlo de Stock */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.trackStock || false}
                    onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-0"
                  />
                  <span className="text-stone-300 font-semibold">Ativar Controlo de Stock</span>
                </label>

                {formData.trackStock && (
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">Qtd em Stock:</span>
                    <input
                      type="number"
                      value={formData.stockQuantity || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-16 bg-stone-950 border border-stone-800 rounded px-2 py-1 font-mono text-white text-center"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Guardar Produto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
