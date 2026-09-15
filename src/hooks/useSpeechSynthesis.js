// Ler Comigo — única camada que toca `speechSynthesis`/`SpeechSynthesisUtterance`
// (seção 17 do briefing: um hook, não um hook e um service). Nenhuma tela
// chama a Web Speech API diretamente; tudo passa por aqui.
//
// Garantias centrais:
// - UMA fala ativa por vez: todo `speak()` cancela a fila antes de começar,
//   e um "token de geração" invalida callbacks (onend/onerror) de uma
//   utterance antiga que ainda dispare depois de um cancel/novo speak.
// - Vozes carregam de forma assíncrona em alguns navegadores: escuta
//   `voiceschanged` e limpa o listener no cleanup.
// - Cleanup obrigatório: cancela ao desmontar e em pagehide/beforeunload —
//   a voz nunca deve continuar depois que o usuário saiu da tela.
// - Sem suporte (`speechSynthesis`/`SpeechSynthesisUtterance` ausentes):
//   status "unsupported", toda ação vira no-op silencioso — a tela decide
//   o que mostrar (banner "leitura em voz não disponível").

import { useCallback, useEffect, useRef, useState } from "react";
import { isSpeechSupported, pickVoice, normalizeRate } from "../utils/speech.js";

// Mitigação do corte de ~15s do Chrome em utterances longas: um "pulso" de
// pause/resume a cada ~10s mantém a engine viva. Trechos já são limitados
// por maxChars (segmentação), então isto raramente dispara — mas fica isolado
// aqui, sem interferir no status visível (usa um ref para não confundir
// pause/resume manuais do usuário com o pulso interno).
const KEEP_ALIVE_INTERVAL_MS = 10000;

export function useSpeechSynthesis() {
  const win = typeof window !== "undefined" ? window : undefined;
  const supported = isSpeechSupported(win);

  const [status, setStatus] = useState(supported ? "idle" : "unsupported");
  const voicesRef = useRef([]);
  const tokenRef = useRef(0);
  const keepAliveRef = useRef(null);
  const suppressStatusRef = useRef(false);

  useEffect(() => {
    if (!supported) return undefined;
    const synth = win.speechSynthesis;

    function loadVoices() {
      voicesRef.current = synth.getVoices() || [];
    }
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [supported, win]);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const startKeepAlive = useCallback(() => {
    if (!supported || keepAliveRef.current) return;
    keepAliveRef.current = setInterval(() => {
      const synth = win.speechSynthesis;
      if (!synth.speaking || synth.paused) return;
      suppressStatusRef.current = true;
      synth.pause();
      synth.resume();
      suppressStatusRef.current = false;
    }, KEEP_ALIVE_INTERVAL_MS);
  }, [supported, win]);

  const cancel = useCallback(() => {
    stopKeepAlive();
    if (!supported) return;
    tokenRef.current += 1;
    win.speechSynthesis.cancel();
    setStatus("idle");
  }, [supported, win, stopKeepAlive]);

  const speak = useCallback(
    (text, { rate, lang = "pt-BR", onEnd } = {}) => {
      if (!supported || !text) return;

      // Nunca duas utterances ativas: cancela a fila antes de falar de novo,
      // e invalida qualquer callback de uma utterance anterior via token.
      tokenRef.current += 1;
      const myToken = tokenRef.current;
      const synth = win.speechSynthesis;
      synth.cancel();
      stopKeepAlive();

      const utterance = new win.SpeechSynthesisUtterance(text);
      utterance.rate = normalizeRate(rate);
      utterance.lang = lang;
      const voice = pickVoice(voicesRef.current, lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (tokenRef.current !== myToken) return;
        setStatus("speaking");
        startKeepAlive();
      };
      utterance.onend = () => {
        if (tokenRef.current !== myToken) return;
        stopKeepAlive();
        setStatus("idle");
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        if (tokenRef.current !== myToken) return;
        stopKeepAlive();
        setStatus("idle");
      };
      utterance.onpause = () => {
        if (tokenRef.current !== myToken || suppressStatusRef.current) return;
        setStatus("paused");
      };
      utterance.onresume = () => {
        if (tokenRef.current !== myToken || suppressStatusRef.current) return;
        setStatus("speaking");
      };

      synth.speak(utterance);
    },
    [supported, win, startKeepAlive, stopKeepAlive]
  );

  const pause = useCallback(() => {
    if (!supported) return;
    stopKeepAlive();
    win.speechSynthesis.pause();
    setStatus("paused");
  }, [supported, win, stopKeepAlive]);

  // Retomada: usa o pause/resume nativos. Em algumas plataformas o browser
  // não volta a falar de fato após resume() (bug conhecido) — quando o
  // chamador passa `fallback`, verificamos logo em seguida e, se a engine
  // não estiver falando, refalamos o trecho do zero (não há como retomar de
  // um offset exato dentro da frase; ver decisão T9 do plano).
  const resume = useCallback(
    (fallback) => {
      if (!supported) return;
      const synth = win.speechSynthesis;
      synth.resume();
      setStatus("speaking");
      if (fallback?.text) {
        setTimeout(() => {
          if (!synth.speaking) {
            speak(fallback.text, { rate: fallback.rate, lang: fallback.lang, onEnd: fallback.onEnd });
          } else {
            startKeepAlive();
          }
        }, 250);
      } else {
        startKeepAlive();
      }
    },
    [supported, win, speak, startKeepAlive]
  );

  // Cleanup obrigatório (seção 27/56 do briefing): a voz nunca sobrevive à
  // desmontagem, troca de conteúdo ou fechamento/troca de aba.
  useEffect(() => {
    if (!supported) return undefined;
    const handleUnload = () => win.speechSynthesis.cancel();
    win.addEventListener("pagehide", handleUnload);
    win.addEventListener("beforeunload", handleUnload);
    return () => {
      stopKeepAlive();
      win.speechSynthesis.cancel();
      win.removeEventListener("pagehide", handleUnload);
      win.removeEventListener("beforeunload", handleUnload);
    };
  }, [supported, win, stopKeepAlive]);

  return { supported, status, speak, pause, resume, cancel };
}
