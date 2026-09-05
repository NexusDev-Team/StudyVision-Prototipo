// Convenção única de datas do Study Vision.
//
// Armazenamento: string ISO 8601 em UTC (new Date().toISOString()).
// Exibição/agrupamento por dia: "YYYY-MM-DD" sempre em horário LOCAL — usar
// toISOString().slice(0,10) para isso desloca o dia para quem está a oeste de
// Greenwich (no Brasil, tudo depois das 21h cai no dia seguinte).

export const DAY_MS = 24 * 60 * 60 * 1000;

export function nowIso() {
  return new Date().toISOString();
}

// Aceita ISO, epoch em ms, Date ou null e devolve sempre ISO (ou null).
export function toIso(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function toMs(value) {
  const iso = toIso(value);
  return iso ? new Date(iso).getTime() : null;
}

// "YYYY-MM-DD" no fuso do dispositivo — é a chave usada pelo calendário.
export function toDayKey(value) {
  const ms = toMs(value);
  if (ms === null) return null;
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Inverso de toDayKey: meio-dia local, para que a ida e volta entre chave de dia
// e ISO nunca escorregue de dia por causa do fuso.
export function fromDayKey(dayKey) {
  if (typeof dayKey !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0).toISOString();
}

export function todayKey() {
  return toDayKey(Date.now());
}

// "YYYY-MM-DD" da segunda-feira da semana de `value`, em horário LOCAL —
// mesma convenção de toDayKey, usada para agrupar tentativas por semana no
// histórico de evolução (Fase 5). Semana Segunda→Domingo.
export function startOfWeekKey(value) {
  const ms = toMs(value);
  if (ms === null) return null;
  const d = new Date(ms);
  const day = d.getDay(); // 0=domingo .. 6=sábado
  const offsetToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offsetToMonday, 12, 0, 0, 0);
  return toDayKey(monday);
}

export function addDaysIso(value, days) {
  const ms = toMs(value);
  if (ms === null) return null;
  return new Date(ms + days * DAY_MS).toISOString();
}

// Início do dia local de hoje (00:00) — corte para decidir se uma revisão
// está atrasada (scheduledFor anterior a isto).
export function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// true se `value` cai num sábado ou domingo no fuso local.
export function isWeekendIso(value) {
  const ms = toMs(value);
  if (ms === null) return false;
  const day = new Date(ms).getDay();
  return day === 0 || day === 6;
}

// Se `value` cair em fim de semana, avança para a segunda-feira seguinte
// (meio-dia local); caso contrário, devolve o próprio dia ao meio-dia local.
// Usado só pelas revisões de plano — as de compromisso seguem o evento.
export function nextWeekdayIso(value) {
  const ms = toMs(value);
  if (ms === null) return null;
  const d = new Date(ms);
  const day = d.getDay();
  const add = day === 6 ? 2 : day === 0 ? 1 : 0;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + add, 12, 0, 0, 0).toISOString();
}

// Fim do dia local (23:59:59.999) — uma revisão marcada para daqui a algumas
// horas ainda conta como "hoje", não como próxima.
export function endOfTodayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function daysUntil(value) {
  const ms = toMs(value);
  if (ms === null) return null;
  return Math.round((ms - Date.now()) / DAY_MS);
}

// Substitui o antigo campo `item.time`, que era uma string fixa ("Há 2 dias")
// gravada uma vez e nunca recalculada.
export function relativeLabel(value) {
  const ms = toMs(value);
  if (ms === null) return "";
  const diffMs = Date.now() - ms;
  if (diffMs < 60 * 60 * 1000) return "Agora";
  const diffDays = Math.floor(diffMs / DAY_MS);
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 30) return `Há ${diffDays} dias`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return "Há 1 mês";
  if (months < 12) return `Há ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "Há 1 ano" : `Há ${years} anos`;
}

// Rótulo de vencimento de revisão (mesma regra do reviewEngine legado).
export function formatDueIso(value) {
  const ms = toMs(value);
  if (ms === null) return "";
  const diffDays = Math.round((ms - Date.now()) / DAY_MS);
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
