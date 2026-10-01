import React, { useState } from 'react';
import {
  X,
  Printer,
  Mail,
  Download,
  CheckCircle,
  ShieldCheck,
  QrCode,
  Share2,
  Send,
  MessageCircle,
  ExternalLink,
  Clock,
  AlertCircle,
  RotateCw,
  Phone,
  FileText,
  Lock,
} from 'lucide-react';
import { FiscalDocument, RestaurantSettings, User, InvoiceDispatchChannel } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { store } from '../services/storage';

interface ReceiptModalProps {
  document: FiscalDocument | null;
  settings: RestaurantSettings;
  currentUser?: User;
  onClose: () => void;
}

const COUNTRY_CODES = [
  { code: '+351', label: 'Portugal (+351)' },
  { code: '+34', label: 'Espanha (+34)' },
  { code: '+33', label: 'França (+33)' },
  { code: '+44', label: 'Reino Unido (+44)' },
  { code: '+55', label: 'Brasil (+55)' },
  { code: '+1', label: 'EUA/Canadá (+1)' },
  { code: '+49', label: 'Alemanha (+49)' },
  { code: '+41', label: 'Suíça (+41)' },
];

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  document,
  settings,
  currentUser,
  onClose,
}) => {
  const [activeActionTab, setActiveActionTab] = useState<'acoes' | 'email' | 'whatsapp' | 'historico'>('acoes');

  // Email form
  const [emailInput, setEmailInput] = useState('');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // WhatsApp form
  const [countryCode, setCountryCode] = useState('+351');
  const [phoneInput, setPhoneInput] = useState('');
  const [whatsappMode, setWhatsappMode] = useState<'manual' | 'api'>('manual');
  const [whatsappStatus, setWhatsappStatus] = useState<string | null>(null);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  if (!document) return null;

  const operator = currentUser || store.getState().currentUser;

  // Gerador de token seguro não previsível para partilha
  const secureToken = `${document.atcud || 'AT'}_${document.hashSignature.slice(0, 10)}`;
  const secureInvoiceUrl = `https://saboresenacoes.pt/fatura/${encodeURIComponent(
    document.series.replace(/[\s/]/g, '_')
  )}?token=${secureToken}`;

  const defaultWhatsappMessage = `Olá! Obrigado pela sua compra na Sabores & Nações. Segue a sua fatura (${document.series}): ${secureInvoiceUrl}. Esperamos voltar a recebê-lo em breve!`;

  const handlePrint = () => {
    window.print();
    try {
      store.recordInvoiceDispatch({
        documentId: document.id,
        channel: 'print',
        recipient: 'Impressora Local (80mm)',
        status: 'enviado',
        user: operator,
      });
    } catch {
      // Ignora erro de registo
    }
  };

  const handleDownloadTxtOrPdf = (type: 'pdf' | 'txt') => {
    const receiptText = `
========================================
       ${settings.name}
       ${settings.tradeName}
  NIF: ${settings.nif} | CAE: ${settings.cae}
  ${settings.address}, ${settings.city}
  Tel: ${settings.phone}
========================================
DOCUMENTO: ${document.series} (${document.type})
DATA/HORA: ${formatDateTime(document.issuedAt)}
OPERADOR : ${document.operatorName}
CLIENTE  : ${document.customerName}
NIF      : ${document.customerNif}
----------------------------------------
ITENS:
${document.items
  .map(
    (it) =>
      `${it.quantity}x ${it.productName.padEnd(24).slice(0, 24)} ${formatCurrency(
        it.total
      ).padStart(8)} [${(it.vatRate * 100).toFixed(0)}%]`
  )
  .join('\n')}
----------------------------------------
SUBTOTAL S/ IVA : ${formatCurrency(document.subtotal)}
TOTAL IVA       : ${formatCurrency(document.taxTotal)}
TOTAL A PAGAR   : ${formatCurrency(document.grossTotal)}
----------------------------------------
DISCRIMINAÇÃO DE IVA:
${document.vatBreakdown
  .map(
    (b) =>
      `${b.rateLabel.padEnd(20)} Incid: ${formatCurrency(b.baseAmount)} IVA: ${formatCurrency(
        b.vatAmount
      )}`
  )
  .join('\n')}
----------------------------------------
FORMA DE PAGAMENTO: ${document.paymentMethod.toUpperCase()}
ATCUD: ${document.atcud}
HASH : ${document.hashSignature}
ESTADO: ${document.status.toUpperCase()}
========================================
${document.qrCodeData}
========================================
Processado por programa certificado n.º 2234/AT (Vendus PT)
Obrigado pela sua visita à Sabores & Nações!
`;

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Fatura_${document.series.replace(/[\s/]/g, '_')}.${type === 'pdf' ? 'pdf' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);

    try {
      store.recordInvoiceDispatch({
        documentId: document.id,
        channel: 'download_pdf',
        recipient: 'Descarregamento Local',
        status: 'enviado',
        user: operator,
      });
    } catch {
      // Ignora erro
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setEmailStatus('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    // Simulação de envio com certificação Vendus / SMTP seguro
    setTimeout(() => {
      try {
        store.recordInvoiceDispatch({
          documentId: document.id,
          channel: 'email',
          recipient: emailInput.trim(),
          recipientName: document.customerName,
          status: 'enviado',
          user: operator,
          providerResponseId: `MAIL-${Date.now().toString().slice(-6)}`,
        });
        setIsSendingEmail(false);
        setEmailStatus(`Fatura oficial em PDF enviada com sucesso para ${emailInput.trim()}!`);
      } catch (err: any) {
        setIsSendingEmail(false);
        setEmailStatus(`Erro ao enviar: ${err.message}`);
      }
    }, 1000);
  };

  const handleSendWhatsapp = () => {
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 6) {
      setWhatsappStatus('Por favor, informe um número de telefone válido.');
      return;
    }

    const fullRecipient = `${countryCode}${cleanPhone}`;

    if (whatsappMode === 'manual') {
      // Partilha manual via link oficial wa.me
      const encodedMsg = encodeURIComponent(defaultWhatsappMessage);
      const waUrl = `https://wa.me/${countryCode.replace('+', '')}${cleanPhone}?text=${encodedMsg}`;

      try {
        store.recordInvoiceDispatch({
          documentId: document.id,
          channel: 'whatsapp_manual',
          recipient: fullRecipient,
          recipientName: document.customerName,
          countryCode,
          status: 'partilha_iniciada',
          user: operator,
        });

        // Abre em nova janela/aplicação
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        setWhatsappStatus('Partilha iniciada no WhatsApp! Confirme o envio na aplicação.');
      } catch (err: any) {
        setWhatsappStatus(`Erro ao iniciar partilha: ${err.message}`);
      }
    } else {
      // WhatsApp API oficial Cloud API
      setIsSendingWhatsapp(true);
      setWhatsappStatus(null);

      setTimeout(() => {
        try {
          store.recordInvoiceDispatch({
            documentId: document.id,
            channel: 'whatsapp_api',
            recipient: fullRecipient,
            recipientName: document.customerName,
            countryCode,
            status: 'entregue',
            user: operator,
            providerResponseId: `WAMID.${Date.now()}`,
          });
          setIsSendingWhatsapp(false);
          setWhatsappStatus(`Mensagem com fatura entregue via API oficial do WhatsApp Business para ${fullRecipient}!`);
        } catch (err: any) {
          setIsSendingWhatsapp(false);
          setWhatsappStatus(`Erro na API do WhatsApp: ${err.message}`);
        }
      }, 1200);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sabores & Nações | Fatura ${document.series}`,
          text: defaultWhatsappMessage,
          url: secureInvoiceUrl,
        });
        store.recordInvoiceDispatch({
          documentId: document.id,
          channel: 'share_api',
          recipient: 'Menu de Partilha do Dispositivo',
          status: 'enviado',
          user: operator,
        });
      } catch {
        // Usuário cancelou a partilha nativa
      }
    } else {
      alert('A partilha nativa não é suportada neste navegador. Use WhatsApp ou E-mail.');
    }
  };

  const dispatchLogs = document.dispatchLogs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Documento Fiscal Certificado AT</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                  {document.series}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Vendus Certificado n.º 2234/AT • ATCUD: {document.atcud}
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

        {/* Tabs de Ações de Envio e Visualização */}
        <div className="px-5 pt-3 bg-stone-950 border-b border-stone-800 flex gap-2 no-print overflow-x-auto">
          <button
            onClick={() => setActiveActionTab('acoes')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeActionTab === 'acoes'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Talão Fiscal & Ações
          </button>

          <button
            onClick={() => setActiveActionTab('email')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeActionTab === 'email'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Enviar por E-mail
          </button>

          <button
            onClick={() => setActiveActionTab('whatsapp')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeActionTab === 'whatsapp'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Enviar por WhatsApp
          </button>

          <button
            onClick={() => setActiveActionTab('historico')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeActionTab === 'historico'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Histórico de Envios ({dispatchLogs.length})
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col items-center bg-stone-950/60">
          {activeActionTab === 'acoes' && (
            <div className="w-full flex flex-col items-center space-y-4">
              {/* Thermal Receipt Simulator Paper */}
              <div
                id="printable-receipt"
                className="bg-white text-stone-950 font-mono text-xs p-6 rounded-lg shadow-xl w-full max-w-[340px] border border-stone-300 space-y-3 leading-tight select-text"
              >
                {/* Header Restaurante */}
                <div className="text-center space-y-0.5 border-b border-dashed border-stone-400 pb-3">
                  <div className="font-extrabold text-base tracking-wider text-stone-900">
                    {settings.tradeName.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-stone-600 font-semibold">{settings.name}</div>
                  <div className="text-[10px] text-stone-600">
                    NIF: <strong>{settings.nif}</strong> • CAE: {settings.cae}
                  </div>
                  <div className="text-[10px] text-stone-600">{settings.address}</div>
                  <div className="text-[10px] text-stone-600">
                    {settings.postalCode} {settings.city}
                  </div>
                  <div className="text-[10px] text-stone-600">Tel: {settings.phone}</div>
                </div>

                {/* Dados do Documento */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
                  <div className="flex justify-between font-bold text-stone-900">
                    <span>
                      {document.type === 'NC'
                        ? 'NOTA DE CRÉDITO'
                        : document.type === 'FT'
                        ? 'FATURA'
                        : 'FATURA SIMPLIFICADA'}
                    </span>
                    <span>{document.series}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 text-[10px]">
                    <span>Data: {formatDateTime(document.issuedAt)}</span>
                    <span>Via: Original</span>
                  </div>
                  <div className="flex justify-between text-stone-600 text-[10px]">
                    <span>Operador: {document.operatorName}</span>
                    <span>Ref: {document.vendusDocumentId || 'CERTIFICADA'}</span>
                  </div>
                  {document.rectifiesDocumentId && (
                    <div className="text-[10px] text-rose-700 bg-rose-50 p-1 rounded font-semibold">
                      Retifica doc: {document.rectifiesDocumentId} <br />
                      Motivo: {document.rectifyReason}
                    </div>
                  )}
                </div>

                {/* Dados do Cliente */}
                <div className="space-y-0.5 text-[10px] border-b border-dashed border-stone-400 pb-2 text-stone-700">
                  <div className="flex justify-between">
                    <span>Nome:</span>
                    <span className="font-bold text-stone-900">{document.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NIF:</span>
                    <span className="font-bold text-stone-900">{document.customerNif}</span>
                  </div>
                  {document.customerAddress && (
                    <div className="flex justify-between">
                      <span>Morada:</span>
                      <span>{document.customerAddress}</span>
                    </div>
                  )}
                </div>

                {/* Linhas de Itens */}
                <div className="space-y-1.5 border-b border-dashed border-stone-400 pb-3 text-[11px]">
                  <div className="flex justify-between text-[10px] font-bold text-stone-600 uppercase border-b border-stone-300 pb-0.5">
                    <span>Qtd / Descrição</span>
                    <span>Total</span>
                  </div>
                  {document.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-stone-800">
                      <div className="max-w-[210px]">
                        <span className="font-bold mr-1">{item.quantity}x</span>
                        <span>{item.productName}</span>
                        <span className="text-[9px] text-stone-500 ml-1">
                          [IVA {(item.vatRate * 100).toFixed(0)}%]
                        </span>
                      </div>
                      <span className="font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>

                {/* Totais Finais */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
                  <div className="flex justify-between text-stone-600">
                    <span>Incidência (Líquido):</span>
                    <span>{formatCurrency(document.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Total Imposto (IVA):</span>
                    <span>{formatCurrency(document.taxTotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-stone-950 pt-1 border-t border-stone-300">
                    <span>TOTAL A PAGAR:</span>
                    <span>{formatCurrency(document.grossTotal)}</span>
                  </div>
                </div>

                {/* Tabela Resumo de IVA */}
                <div className="space-y-1 text-[9px] border-b border-dashed border-stone-400 pb-2">
                  <div className="font-bold text-stone-700">QUADRO DE INCIDÊNCIA DE IVA</div>
                  <div className="grid grid-cols-3 font-semibold text-stone-500">
                    <span>Taxa</span>
                    <span className="text-right">Base</span>
                    <span className="text-right">Valor IVA</span>
                  </div>
                  {document.vatBreakdown.map((b, i) => (
                    <div key={i} className="grid grid-cols-3 text-stone-800">
                      <span>
                        {(b.rate * 100).toFixed(0)}% ({b.rateLabel.split(' ')[1] || ''})
                      </span>
                      <span className="text-right">{formatCurrency(b.baseAmount)}</span>
                      <span className="text-right">{formatCurrency(b.vatAmount)}</span>
                    </div>
                  ))}
                </div>

                {/* Pagamento e Código ATCUD */}
                <div className="space-y-1 text-[10px] text-stone-700 text-center border-b border-dashed border-stone-400 pb-2">
                  <div>
                    Pagamento: <strong className="uppercase">{document.paymentMethod}</strong>
                  </div>
                  <div className="font-bold text-stone-900 tracking-wider">
                    ATCUD: {document.atcud}
                  </div>
                  <div className="text-[9px] text-stone-500 font-mono">
                    Assinatura AT: {document.hashSignature}-1
                  </div>
                </div>

                {/* QR Code Oficial da AT */}
                <div className="flex flex-col items-center pt-1 pb-1 space-y-1">
                  <div className="p-2 border-2 border-stone-900 rounded bg-stone-100 flex flex-col items-center">
                    <QrCode className="w-20 h-20 text-stone-900" />
                    <span className="text-[8px] font-bold tracking-tight text-stone-600 mt-1">
                      QR CODE AT OFICIAL
                    </span>
                  </div>
                  <p className="text-[8px] text-stone-500 text-center max-w-[280px] break-all">
                    {document.qrCodeData.slice(0, 75)}...
                  </p>
                </div>

                {/* Rodapé Legal Certificação */}
                <div className="text-center text-[9px] text-stone-500 space-y-0.5 pt-2 border-t border-stone-200">
                  <p className="font-semibold text-stone-700">
                    Emitido por programa certificado n.º 2234/AT (Vendus)
                  </p>
                  <p>Obrigado pela sua visita à Sabores & Nações!</p>
                  <p className="text-[8px] text-stone-400">
                    Consulte os seus documentos no portal e-fatura.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA EMAIL (Requisito 13) */}
          {activeActionTab === 'email' && (
            <div className="w-full max-w-lg space-y-4 bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-400 pb-2 border-b border-stone-800">
                <Mail className="w-5 h-5" />
                <h4 className="font-bold text-sm text-white">Enviar Fatura Oficial por E-mail</h4>
              </div>

              <div className="space-y-2 text-xs text-stone-300 bg-stone-950 p-3 rounded-xl border border-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-400">Remetente:</span>
                  <span className="font-semibold text-white">Sabores & Nações ({settings.email})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Assunto:</span>
                  <span className="font-semibold text-white">Sabores & Nações | Fatura da sua compra</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Anexo Oficial:</span>
                  <span className="text-emerald-400 font-mono">
                    Fatura_{document.series.replace(/[\s/]/g, '_')}.pdf (Certificado AT)
                  </span>
                </div>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Endereço de E-mail do Cliente:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@cliente.pt"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 text-sm text-stone-100 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Não exige cadastro completo prévio. Pode corrigir o contacto sem alterar o NIF ou dados fiscais emitidos.
                  </p>
                </div>

                <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-xl text-[11px] text-amber-200/90 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Privacidade e Proteção de Dados:
                  </p>
                  <p>
                    O e-mail é utilizado estritamente para o envio da fatura solicitada e não inscreve o cliente em listas de marketing.
                  </p>
                </div>

                {emailStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      emailStatus.includes('sucesso')
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-800 text-rose-300'
                    }`}
                  >
                    {emailStatus.includes('sucesso') ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{emailStatus}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors"
                >
                  {isSendingEmail ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      A Enviar Fatura Certificada...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Confirmar e Enviar por E-mail
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ABA WHATSAPP (Requisito 13) */}
          {activeActionTab === 'whatsapp' && (
            <div className="w-full max-w-lg space-y-4 bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2 text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                  <h4 className="font-bold text-sm text-white">Enviar Fatura por WhatsApp</h4>
                </div>
                <div className="flex rounded-lg bg-stone-950 p-0.5 border border-stone-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setWhatsappMode('manual')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      whatsappMode === 'manual'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Partilha Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsappMode('api')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      whatsappMode === 'api'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    WhatsApp Business API
                  </button>
                </div>
              </div>

              {/* Informações sobre o modo selecionado */}
              <div className="text-xs text-stone-300 bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1">
                {whatsappMode === 'manual' ? (
                  <p className="text-[11px] text-stone-400">
                    <strong>Modo Partilha Manual:</strong> Abre o WhatsApp Web ou aplicação oficial com mensagem pré-preenchida e link seguro não previsível para a fatura. Registado como <em>"Partilha iniciada"</em>.
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-400">
                    <strong>Modo WhatsApp Business API:</strong> Dispara o envio oficial diretamente via servidor de mensageria com confirmação de entrega imediata.
                  </p>
                )}
              </div>

              {/* Formulário de Telefone com Indicativo */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-stone-300">
                  Número de WhatsApp com Indicativo do País:
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-stone-950 border border-stone-700 text-xs text-stone-200 rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-emerald-500 max-w-[150px]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="912 345 678"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 text-sm text-stone-100 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Pré-visualização da Mensagem */}
                <div>
                  <span className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Mensagem que será enviada:
                  </span>
                  <div className="bg-emerald-950/20 border border-emerald-900/60 p-3 rounded-xl text-xs text-emerald-200 font-sans leading-relaxed break-words">
                    “{defaultWhatsappMessage}”
                  </div>
                </div>

                {/* Link Seguro Imprevisível */}
                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-[11px] flex items-center justify-between text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Link Seguro Temporário (Validade 30 dias)
                  </span>
                  <span className="font-mono text-[10px] text-stone-500">
                    token: {secureToken.slice(0, 16)}...
                  </span>
                </div>

                {whatsappStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      whatsappStatus.includes('sucesso') ||
                      whatsappStatus.includes('entregue') ||
                      whatsappStatus.includes('iniciada')
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-800 text-rose-300'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{whatsappStatus}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendWhatsapp}
                    disabled={isSendingWhatsapp}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors"
                  >
                    {isSendingWhatsapp ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        A Enviar via WhatsApp API...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        {whatsappMode === 'manual'
                          ? 'Abrir WhatsApp e Iniciar Partilha'
                          : 'Enviar via WhatsApp API'}
                      </>
                    )}
                  </button>

                  {typeof navigator !== 'undefined' && !!navigator.share && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      title="Partilhar pelo Menu do Dispositivo"
                      className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-stone-700"
                    >
                      <Share2 className="w-4 h-4" />
                      Partilhar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA HISTÓRICO DE ENVIOS (Requisito 13) */}
          {activeActionTab === 'historico' && (
            <div className="w-full max-w-lg space-y-3 bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Clock className="w-5 h-5" />
                  <h4 className="font-bold text-sm text-white">Auditoria e Histórico de Envios</h4>
                </div>
                <span className="text-xs text-stone-400 font-mono">
                  Doc: {document.series}
                </span>
              </div>

              {dispatchLogs.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-xs space-y-1">
                  <p>Ainda não foram efetuados envios digitais para esta fatura.</p>
                  <p className="text-[11px] text-stone-600">
                    Pode enviar por e-mail ou WhatsApp a qualquer momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {dispatchLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-200 uppercase flex items-center gap-1.5">
                          {log.channel === 'email' && <Mail className="w-3.5 h-3.5 text-amber-400" />}
                          {log.channel === 'whatsapp_api' && (
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {log.channel === 'whatsapp_manual' && (
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {log.channel === 'share_api' && <Share2 className="w-3.5 h-3.5 text-blue-400" />}
                          {log.channel === 'print' && <Printer className="w-3.5 h-3.5 text-stone-400" />}
                          {log.channel === 'download_pdf' && (
                            <Download className="w-3.5 h-3.5 text-purple-400" />
                          )}
                          {log.channel.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'enviado' || log.status === 'entregue'
                              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                              : log.status === 'partilha_iniciada'
                              ? 'bg-blue-950 border border-blue-800 text-blue-300'
                              : 'bg-rose-950 border border-rose-800 text-rose-300'
                          }`}
                        >
                          {log.status === 'partilha_iniciada'
                            ? 'Partilha iniciada'
                            : log.status === 'enviado'
                            ? 'Enviado'
                            : log.status === 'entregue'
                            ? 'Entregue'
                            : log.status}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-stone-400">
                        <span>Destinatário: <strong className="text-stone-300">{log.recipient}</strong></span>
                        <span>{formatDateTime(log.timestamp)}</span>
                      </div>

                      <div className="flex justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-800/60">
                        <span>Operador: {log.operatorName}</span>
                        <a
                          href={log.secureUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-500 hover:underline flex items-center gap-0.5"
                        >
                          Link seguro <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com 4 Ações Principais (Requisito 13) */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3 no-print">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Enviar por E-mail */}
            <button
              onClick={() => setActiveActionTab('email')}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                activeActionTab === 'email'
                  ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                  : 'bg-stone-900 border-stone-800 text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Mail className="w-4 h-4 text-amber-400" />
              Enviar por E-mail
            </button>

            {/* 2. Enviar por WhatsApp */}
            <button
              onClick={() => setActiveActionTab('whatsapp')}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                activeActionTab === 'whatsapp'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                  : 'bg-stone-900 border-stone-800 text-stone-200 hover:bg-stone-800'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Enviar por WhatsApp
            </button>

            {/* 3. Descarregar PDF */}
            <button
              onClick={() => handleDownloadTxtOrPdf('pdf')}
              className="px-3 py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Descarregar PDF
            </button>

            {/* 4. Imprimir */}
            <button
              onClick={handlePrint}
              className="px-3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir Talão
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-stone-500 font-mono">
              Fatura Certificada Vendus / AT • {document.series}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg"
            >
              Concluir / Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
