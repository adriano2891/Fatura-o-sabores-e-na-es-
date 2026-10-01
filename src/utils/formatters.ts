/**
 * Utilitários de Formatação e Validação para Portugal (pt-PT)
 * Fuso horário: Europe/Lisbon
 * Moeda: Euro (€)
 */

export function formatCurrency(value: number | undefined | null): string {
  const val = Number(value) || 0;
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(val)
    .replace('€', '')
    .trim() + ' €';
}

export function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Lisbon',
  }).format(d);
}

export function formatTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Lisbon',
  }).format(d);
}

export function formatDateTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function getElapsedMinutes(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - d);
  return Math.floor(diffMs / 60000);
}

export function formatElapsed(dateStr: string | undefined): string {
  const mins = getElapsedMinutes(dateStr);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/**
 * Validação de NIF Português (Módulo 11)
 * Regras da Autoridade Tributária e Aduaneira
 */
export function validatePortugueseNIF(nif: string): { valid: boolean; message?: string } {
  const cleanNif = (nif || '').trim().replace(/\s+/g, '');

  if (!cleanNif) {
    return { valid: false, message: 'NIF não pode estar vazio' };
  }

  // Permite consumidor final genérico
  if (cleanNif === '999999990') {
    return { valid: true };
  }

  if (!/^[0-9]{9}$/.test(cleanNif)) {
    return { valid: false, message: 'O NIF deve conter exatamente 9 dígitos numéricos' };
  }

  const firstChar = cleanNif.charAt(0);
  const validFirstDigits = ['1', '2', '3', '5', '6', '8', '9'];
  if (!validFirstDigits.includes(firstChar)) {
    return { valid: false, message: 'Dígito inicial do NIF inválido para Portugal' };
  }

  let total = 0;
  for (let i = 0; i < 8; i++) {
    total += parseInt(cleanNif.charAt(i), 10) * (9 - i);
  }

  const modulo11 = total % 11;
  let checkDigit = 11 - modulo11;
  if (checkDigit >= 10) {
    checkDigit = 0;
  }

  const controlDigit = parseInt(cleanNif.charAt(8), 10);
  if (checkDigit !== controlDigit) {
    return { valid: false, message: 'Dígito de controlo do NIF inválido (Módulo 11)' };
  }

  return { valid: true };
}

/**
 * Sintetizador Web Audio API para alertas na Cozinha e Atendimento
 * Não necessita de ficheiros áudio externos
 */
export function playAlertSound(type: 'ready' | 'order' | 'cancel' | 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'ready') {
      // Tom agudo duplo agradável indicando prato pronto
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'order') {
      // Bell da cozinha
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'cancel') {
      // Alerta grave de cancelamento
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'success') {
      // Pagamento confirmado
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // Silencioso se o áudio não estiver disponível
  }
}
