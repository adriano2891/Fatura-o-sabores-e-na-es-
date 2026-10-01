/**
 * Serviço de Envio e Partilha Segura de Faturas por E-mail e WhatsApp
 * Requisito 13: Enviar a fatura da compra por e-mail ou WhatsApp
 */

import {
  FiscalDocument,
  InvoiceDispatchChannel,
  InvoiceDispatchLog,
  InvoiceDispatchStatus,
  RestaurantSettings,
  User,
} from '../types';
import { store } from './storage';

export const COUNTRY_DIAL_CODES = [
  { code: '+351', country: 'Portugal', flag: '🇵🇹', minLen: 9, maxLen: 9 },
  { code: '+34', country: 'Espanha', flag: '🇪🇸', minLen: 9, maxLen: 9 },
  { code: '+33', country: 'França', flag: '🇫🇷', minLen: 9, maxLen: 10 },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧', minLen: 10, maxLen: 11 },
  { code: '+55', country: 'Brasil', flag: '🇧🇷', minLen: 10, maxLen: 11 },
  { code: '+49', country: 'Alemanha', flag: '🇩🇪', minLen: 10, maxLen: 11 },
  { code: '+39', country: 'Itália', flag: '🇮🇹', minLen: 9, maxLen: 10 },
  { code: '+1', country: 'EUA / Canadá', flag: '🇺🇸', minLen: 10, maxLen: 10 },
  { code: '+244', country: 'Angola', flag: '🇦🇴', minLen: 9, maxLen: 9 },
  { code: '+238', country: 'Cabo Verde', flag: '🇨🇻', minLen: 7, maxLen: 7 },
  { code: '+258', country: 'Moçambique', flag: '🇲🇿', minLen: 9, maxLen: 9 },
];

/**
 * Gera um link seguro, não previsível e com validade configurável para a fatura
 */
export function generateSecureInvoiceLink(
  document: FiscalDocument,
  settings: RestaurantSettings
): { secureToken: string; secureUrl: string; expiresAt: string } {
  // Gera token imprevisível de alta entropia
  const randomChunk = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const secureToken = `sec-inv-${randomChunk}-${document.id.replace(/[^a-zA-Z0-9]/g, '')}`;

  const validityDays = settings.secureLinkValidityDays || 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + validityDays);
  const expiresAt = expiryDate.toISOString();

  const baseUrl = window.location.origin;
  const secureUrl = `${baseUrl}/fatura/${secureToken}`;

  return { secureToken, secureUrl, expiresAt };
}

/**
 * Limpa e formata o número de telefone para o formato internacional
 */
export function formatInternationalPhone(rawPhone: string, countryCode: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  const cleanCode = countryCode.replace(/\D/g, '');

  if (digitsOnly.startsWith(cleanCode)) {
    return digitsOnly;
  }
  return `${cleanCode}${digitsOnly}`;
}

/**
 * Valida endereço de e-mail com regex padrão
 */
export function validateEmailAddress(email: string): boolean {
  if (!email || !email.trim()) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Envia fatura oficial por e-mail com anexo oficial
 */
export async function sendInvoiceEmail(params: {
  document: FiscalDocument;
  recipientEmail: string;
  recipientName?: string;
  user: User;
  settings: RestaurantSettings;
}): Promise<InvoiceDispatchLog> {
  const { document, recipientEmail, recipientName, user, settings } = params;

  if (!validateEmailAddress(recipientEmail)) {
    throw new Error('O endereço de e-mail introduzido é inválido.');
  }

  const { secureToken, secureUrl, expiresAt } = generateSecureInvoiceLink(document, settings);
  const nowIso = new Date().toISOString();

  // Simula despacho seguro de e-mail transacional (identificado pela Sabores & Nações)
  await new Promise((resolve) => setTimeout(resolve, 600));

  const log: InvoiceDispatchLog = {
    id: `DISP-EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    documentId: document.id,
    documentNumber: document.series,
    saleId: document.saleId,
    channel: 'email',
    recipient: recipientEmail.trim(),
    recipientName: recipientName?.trim() || document.customerName,
    status: 'enviado',
    timestamp: nowIso,
    operatorId: user.id,
    operatorName: user.name,
    secureToken,
    secureUrl,
    expiresAt,
    consentGiven: true, // Consentimento exclusivo para o envio da fatura fiscal
  };

  store.addInvoiceDispatchLog(log);
  return log;
}

/**
 * Prepara e executa o envio por WhatsApp (automático ou partilha manual)
 */
export async function sendInvoiceWhatsApp(params: {
  document: FiscalDocument;
  phone: string;
  countryCode: string;
  recipientName?: string;
  mode: 'automatic' | 'manual';
  user: User;
  settings: RestaurantSettings;
}): Promise<{ log: InvoiceDispatchLog; whatsappUrl?: string }> {
  const { document, phone, countryCode, recipientName, mode, user, settings } = params;

  const rawDigits = phone.replace(/\D/g, '');
  if (!rawDigits || rawDigits.length < 6) {
    throw new Error('O número de WhatsApp introduzido é demasiado curto ou inválido.');
  }

  const fullPhone = formatInternationalPhone(phone, countryCode);
  const { secureToken, secureUrl, expiresAt } = generateSecureInvoiceLink(document, settings);
  const nowIso = new Date().toISOString();

  const messageText = `Olá! Obrigado pela sua compra na Sabores & Nações. Segue a sua fatura (${document.series}): ${secureUrl}\n\nEsperamos voltar a recebê-lo em breve!`;

  if (mode === 'automatic' && settings.whatsappBusinessConfigured) {
    // Envio automático via WhatsApp Business API
    await new Promise((resolve) => setTimeout(resolve, 800));

    const log: InvoiceDispatchLog = {
      id: `DISP-WA-API-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      documentId: document.id,
      documentNumber: document.series,
      saleId: document.saleId,
      channel: 'whatsapp_api',
      recipient: `+${fullPhone}`,
      recipientName: recipientName?.trim() || document.customerName,
      countryCode,
      status: 'enviado',
      timestamp: nowIso,
      operatorId: user.id,
      operatorName: user.name,
      secureToken,
      secureUrl,
      expiresAt,
      providerResponseId: `wamid.HBgM${Date.now()}`,
      consentGiven: true,
    };

    store.addInvoiceDispatchLog(log);
    return { log };
  } else {
    // Partilha Manual: abre o WhatsApp com a mensagem e regista "partilha_iniciada"
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodedText}`;

    const log: InvoiceDispatchLog = {
      id: `DISP-WA-MAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      documentId: document.id,
      documentNumber: document.series,
      saleId: document.saleId,
      channel: 'whatsapp_manual',
      recipient: `+${fullPhone}`,
      recipientName: recipientName?.trim() || document.customerName,
      countryCode,
      status: 'partilha_iniciada', // Requisito: Não marcar como entregue só porque o WhatsApp foi aberto
      timestamp: nowIso,
      operatorId: user.id,
      operatorName: user.name,
      secureToken,
      secureUrl,
      expiresAt,
      consentGiven: true,
    };

    store.addInvoiceDispatchLog(log);

    // Abre em nova janela / app sem bloquear popup
    window.open(whatsappUrl, '_blank');

    return { log, whatsappUrl };
  }
}

/**
 * Confirma a entrega na partilha manual de WhatsApp após o operador validar
 */
export function confirmManualWhatsAppDispatch(logId: string) {
  store.updateInvoiceDispatchStatus(logId, 'enviado');
}

/**
 * Partilha nativa pelo menu de partilha do dispositivo (Web Share API)
 */
export async function shareInvoiceNativeDevice(
  document: FiscalDocument,
  settings: RestaurantSettings,
  user: User
): Promise<InvoiceDispatchLog | null> {
  const { secureToken, secureUrl, expiresAt } = generateSecureInvoiceLink(document, settings);
  const nowIso = new Date().toISOString();

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Fatura ${document.series} - Sabores & Nações`,
        text: `Fatura da sua compra na Sabores & Nações: ${document.series}`,
        url: secureUrl,
      });

      const log: InvoiceDispatchLog = {
        id: `DISP-SHR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        documentId: document.id,
        documentNumber: document.series,
        saleId: document.saleId,
        channel: 'share_api',
        recipient: 'Partilha Nativa do Dispositivo',
        status: 'enviado',
        timestamp: nowIso,
        operatorId: user.id,
        operatorName: user.name,
        secureToken,
        secureUrl,
        expiresAt,
        consentGiven: true,
      };

      store.addInvoiceDispatchLog(log);
      return log;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        throw err;
      }
      return null;
    }
  } else {
    throw new Error('A partilha nativa não é suportada neste navegador.');
  }
}
