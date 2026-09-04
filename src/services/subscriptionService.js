// Estado de assinatura do Study Vision+ — vive fora do sv_db acadêmico
// (chave própria), nunca influencia dados de aprendizagem. Sem cobrança
// real: só simula free/trial/premium para demonstrar o produto.
//
// Formato persistido: { plan: "free"|"premium", status: "active"|"trial"|"expired",
// trialStartedAt: ISO|null, trialEndsAt: ISO|null }.

import { TRIAL_DAYS } from "../constants.js";
import { nowIso, addDaysIso, toMs, DAY_MS } from "../utils/date.js";

const KEY = "sv_subscription";
export { TRIAL_DAYS };

const DEFAULT_SUBSCRIPTION = { plan: "free", status: "active", trialStartedAt: null, trialEndsAt: null };

function isCurrentShape(s) {
  return (
    s &&
    typeof s === "object" &&
    (s.plan === "free" || s.plan === "premium") &&
    ["active", "trial", "expired"].includes(s.status)
  );
}

// Formato anterior à Fase 5: { status: "free"|"plus", trialStartedAt }.
// Migrado em silêncio, sem perder trialStartedAt.
function migrateLegacy(stored) {
  if (!stored || typeof stored !== "object") return null;
  if (stored.status === "plus") {
    const trialStartedAt = stored.trialStartedAt || nowIso();
    return { plan: "premium", status: "trial", trialStartedAt, trialEndsAt: addDaysIso(trialStartedAt, TRIAL_DAYS) };
  }
  if (stored.status === "free") {
    return { ...DEFAULT_SUBSCRIPTION };
  }
  return null;
}

function persist(sub) {
  try { localStorage.setItem(KEY, JSON.stringify(sub)); } catch {}
  return sub;
}

// Lê o estado persistido, migrando o formato antigo e expirando o teste que
// já passou dos 7 dias — nunca deixa o app achar que o teste continua ativo
// só porque o contador chegou a 0.
export function getSubscription() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { raw = null; }

  let sub = isCurrentShape(raw) ? raw : migrateLegacy(raw);
  if (!sub) sub = { ...DEFAULT_SUBSCRIPTION };
  if (raw === null || JSON.stringify(raw) !== JSON.stringify(sub)) persist(sub);

  if (sub.status === "trial" && sub.trialEndsAt && Date.now() >= new Date(sub.trialEndsAt).getTime()) {
    sub = { ...sub, plan: "free", status: "expired" };
    persist(sub);
  }

  return sub;
}

export function startTrial() {
  const trialStartedAt = nowIso();
  return persist({ plan: "premium", status: "trial", trialStartedAt, trialEndsAt: addDaysIso(trialStartedAt, TRIAL_DAYS) });
}

export function resetToFree() {
  return persist({ ...DEFAULT_SUBSCRIPTION });
}

export function isPremium(sub = getSubscription()) {
  return sub.plan === "premium";
}

export function isTrialActive(sub = getSubscription()) {
  return sub.status === "trial";
}

export function trialDaysRemaining(sub = getSubscription()) {
  if (sub.status !== "trial" || !sub.trialEndsAt) return 0;
  const ms = toMs(sub.trialEndsAt);
  if (ms === null) return 0;
  return Math.max(0, Math.min(TRIAL_DAYS, Math.ceil((ms - Date.now()) / DAY_MS)));
}
