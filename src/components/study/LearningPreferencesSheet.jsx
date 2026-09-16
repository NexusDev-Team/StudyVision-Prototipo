import { useState } from "react";
import { X, Check } from "lucide-react";
import Modal from "../ui/Modal";
import { LEARNING_PREFERENCE_KEYS, LEARNING_PREFERENCE_META } from "../../constants";
import { normalizePreferenceOptions } from "../../services/learningPreferencesService";

// Modo Inclusão — bottom sheet "Como podemos adaptar seus estudos?". Um único
// componente para os três contextos: configuração inicial (onboarding),
// edição do padrão pelo ⚙️ da câmera, e revisão das necessidades de UMA
// captura. Não decide regra de negócio: coleta a seleção e devolve via
// onSave(options, { makeDefault }). Quem valida/persiste é o serviço.
//
// Vocabulário: sempre "Tenho dificuldade para…", "Você escolhe…". Nunca
// "você sofre/possui/seu transtorno", nunca rótulo médico.
//
// Props:
//  - title, subtitle: textos do cabeçalho
//  - value: objeto de opções inicial (as chaves de LEARNING_PREFERENCE_KEYS)
//  - onSave(options, { makeDefault }): confirma
//  - onClose(): fecha sem salvar (backdrop, Esc, X)
//  - onSkip(): opcional — mostra "Pular por agora" (só no onboarding)
//  - saveLabel: rótulo do CTA
//  - preview: nó opcional renderizado acima das opções (ex: a foto da captura)
//  - showMakeDefault: mostra o checkbox "Tornar meu padrão" (contexto de captura)
export default function LearningPreferencesSheet({
  title = "Como podemos adaptar seus estudos?",
  subtitle = "Selecione as dificuldades que você encontra durante seus estudos. O Study Vision usará suas escolhas para adaptar os conteúdos para você.",
  value,
  onSave,
  onClose,
  onSkip,
  saveLabel = "Salvar preferências",
  preview = null,
  showMakeDefault = false,
}) {
  const [selected, setSelected] = useState(() => normalizePreferenceOptions(value));
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected, { makeDefault });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} label={title}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>{title}</p>
        <button onClick={onClose} aria-label="Fechar"
          style={{ width: 44, height: 44, flexShrink: 0, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -8, marginRight: -8 }}>
          <X size={20} color="#94A3B8" />
        </button>
      </div>

      <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px", fontFamily: "Inter,sans-serif", lineHeight: 1.5 }}>
        {subtitle}
      </p>

      {preview && <div style={{ marginBottom: 16 }}>{preview}</div>}

      <div role="group" aria-label="Preferências de aprendizagem" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {LEARNING_PREFERENCE_KEYS.map((key) => {
          const meta = LEARNING_PREFERENCE_META[key];
          const active = !!selected[key];
          const descriptionId = `learning-pref-desc-${key}`;
          return (
            <button
              key={key}
              type="button"
              role="checkbox"
              aria-checked={active}
              aria-describedby={descriptionId}
              onClick={() => toggle(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                minHeight: 44,
                padding: "12px 14px",
                textAlign: "left",
                borderRadius: 14,
                border: active ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0",
                background: active ? "#EFF6FF" : "white",
                cursor: "pointer",
                fontFamily: "Inter,sans-serif",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{meta.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: active ? "#1D4ED8" : "#111827" }}>{meta.label}</span>
                <span id={descriptionId} style={{ display: "block", fontSize: 12, color: "#64748B", marginTop: 2 }}>{meta.description}</span>
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: 7,
                  border: active ? "none" : "1.5px solid #CBD5E1",
                  background: active ? "#2563EB" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {active && <Check size={14} color="white" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {showMakeDefault && (
        <button
          type="button"
          role="checkbox"
          aria-checked={makeDefault}
          onClick={() => setMakeDefault((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            minHeight: 44,
            padding: "8px 4px",
            marginBottom: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "Inter,sans-serif",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
              borderRadius: 6,
              border: makeDefault ? "none" : "1.5px solid #CBD5E1",
              background: makeDefault ? "#2563EB" : "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {makeDefault && <Check size={13} color="white" strokeWidth={3} />}
          </span>
          <span style={{ fontSize: 13, color: "#475569", textAlign: "left" }}>
            Tornar meu padrão para as próximas capturas
          </span>
        </button>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", height: 52, borderRadius: 16, background: "#2563EB", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px -4px rgba(37,99,235,0.4)" }}>
        {saving ? "Salvando..." : saveLabel}
      </button>

      {onSkip && (
        <button onClick={onSkip} disabled={saving}
          style={{ width: "100%", height: 44, marginTop: 8, borderRadius: 14, background: "none", color: "#64748B", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
          Pular por agora
        </button>
      )}
    </Modal>
  );
}
