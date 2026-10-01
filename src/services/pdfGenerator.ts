/**
 * Gerador de PDF e Documento Fiscal Oficial Certificado para Portugal
 * Cumpre os requisitos da AT (Portaria n.º 195/2020) e especificações Vendus PT
 */

import { FiscalDocument, RestaurantSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export function generateOfficialInvoiceHtml(
  document: FiscalDocument,
  settings: RestaurantSettings
): string {
  const docTitle =
    document.type === 'FS'
      ? 'FATURA SIMPLIFICADA'
      : document.type === 'FT'
      ? 'FATURA'
      : document.type === 'FR'
      ? 'FATURA-RECIBO'
      : document.type === 'NC'
      ? 'NOTA DE CRÉDITO'
      : 'DOCUMENTO FISCAL';

  return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} ${document.series}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1c1917;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.4;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #ea580c;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #ea580c;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #78716c;
      margin-top: 2px;
    }
    .doc-type-badge {
      background: #fff7ed;
      border: 1px solid #fdba74;
      color: #9a3412;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 15px;
      display: inline-block;
      text-align: right;
    }
    .details-grid {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }
    .box {
      flex: 1;
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .box-title {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #a8a29e;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #f5f5f4;
      border-bottom: 1px solid #d6d3d1;
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #57534e;
    }
    .items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e7e5e4;
      font-size: 12px;
    }
    .vat-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    .vat-table th {
      background: #f5f5f4;
      padding: 6px 8px;
      border-bottom: 1px solid #e7e5e4;
      text-align: left;
    }
    .vat-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f5f5f4;
    }
    .totals-box {
      margin-left: auto;
      width: 280px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 24px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .total-grand {
      font-size: 16px;
      font-weight: 800;
      color: #c2410c;
      border-top: 1px solid #fdba74;
      padding-top: 6px;
      margin-top: 6px;
    }
    .footer-at {
      background: #fafaf9;
      border: 1px dashed #d6d3d1;
      border-radius: 8px;
      padding: 12px;
      font-size: 10px;
      color: #78716c;
      text-align: center;
    }
    .qr-text {
      word-break: break-all;
      font-family: monospace;
      font-size: 8px;
      background: #ffffff;
      padding: 6px;
      border: 1px solid #e7e5e4;
      border-radius: 4px;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="brand-title">${settings.name}</h1>
        <div class="brand-sub">${settings.tradeName} • Restauração Tradicional e Sabores do Mundo</div>
        <div style="font-size: 11px; color: #57534e; margin-top: 4px;">
          NIF: <strong>${settings.nif}</strong> | CAE: <strong>${settings.cae}</strong><br>
          ${settings.address}, ${settings.postalCode} ${settings.city} | Tel: ${settings.phone}
        </div>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <div class="doc-type-badge">${docTitle}</div>
        <div style="font-size: 16px; font-weight: 800; color: #1c1917; margin-top: 4px;">
          ${document.series}
        </div>
        <div style="font-size: 11px; color: #78716c;">
          Data de Emissão: <strong>${formatDateTime(document.issuedAt)}</strong>
        </div>
      </td>
    </tr>
  </table>

  <div class="details-grid">
    <div class="box">
      <div class="box-title">Adquirente / Cliente</div>
      <div style="font-weight: 700; font-size: 13px;">${document.customerName}</div>
      <div style="color: #57534e; font-size: 11px; margin-top: 2px;">
        NIF: <strong>${document.customerNif}</strong>
      </div>
      ${document.customerAddress ? `<div style="color: #78716c; font-size: 11px; margin-top: 2px;">${document.customerAddress}</div>` : ''}
    </div>

    <div class="box">
      <div class="box-title">Identificação da Operação</div>
      <div style="font-size: 11px; color: #57534e;">
        Operador: <strong>${document.operatorName}</strong><br>
        Forma de Pagamento: <strong>${document.paymentMethod.toUpperCase()}</strong><br>
        ATCUD: <strong style="font-family: monospace; color: #ea580c;">${document.atcud}</strong>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50px;">Qtd</th>
        <th>Designação do Produto</th>
        <th style="text-align: right; width: 90px;">Preço Unit.</th>
        <th style="text-align: center; width: 70px;">Taxa IVA</th>
        <th style="text-align: right; width: 100px;">Total c/ IVA</th>
      </tr>
    </thead>
    <tbody>
      ${document.items
        .map(
          (item) => `
        <tr>
          <td style="font-weight: 700;">${item.quantity}x</td>
          <td>${item.productName}</td>
          <td style="text-align: right; font-family: monospace;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align: center;">${(item.vatRate * 100).toFixed(0)}%</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(item.total)}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div style="display: flex; gap: 20px; align-items: flex-start;">
    <div style="flex: 1;">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #78716c; margin-bottom: 4px;">
        Quadro de Decomposição do IVA (Portaria 195/2020)
      </div>
      <table class="vat-table">
        <thead>
          <tr>
            <th>Taxa</th>
            <th style="text-align: right;">Incidência</th>
            <th style="text-align: right;">Valor do IVA</th>
          </tr>
        </thead>
        <tbody>
          ${document.vatBreakdown
            .map(
              (b) => `
            <tr>
              <td>${b.rateLabel}</td>
              <td style="text-align: right; font-family: monospace;">${formatCurrency(b.baseAmount)}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(b.vatAmount)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="totals-box">
      <div class="total-row">
        <span>Total Ilíquido (s/ IVA):</span>
        <span style="font-family: monospace;">${formatCurrency(document.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>Total Imposto (IVA):</span>
        <span style="font-family: monospace;">${formatCurrency(document.taxTotal)}</span>
      </div>
      <div class="total-row total-grand">
        <span>Total a Pagar:</span>
        <span style="font-family: monospace;">${formatCurrency(document.grossTotal)}</span>
      </div>
    </div>
  </div>

  <div class="footer-at">
    <div style="font-weight: 700; color: #44403c;">
      ${document.atcud} - Processado por programa certificado n.º 2234/AT (Vendus)
    </div>
    <div style="margin-top: 3px;">
      Hash: <span style="font-family: monospace; font-weight: 700;">${document.hashSignature}</span> • Os bens/serviços foram colocados à disposição do adquirente na data e local do documento.
    </div>
    <div class="qr-text">
      ${document.qrCodeData}
    </div>
    <div style="margin-top: 6px; font-weight: 600; color: #c2410c;">
      Sabores & Nações agradece a sua preferência! Até breve!
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Descarrega o PDF oficial do documento
 */
export function downloadOfficialInvoicePdf(document: FiscalDocument, settings: RestaurantSettings) {
  const html = generateOfficialInvoiceHtml(document, settings);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Cria janela de impressão para PDF ou download direto do ficheiro HTML compatível
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } else {
    // Fallback: download do ficheiro
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Fatura_${document.series.replace(/[\s/]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
