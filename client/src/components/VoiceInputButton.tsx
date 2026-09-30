import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SpeechResult = { 0?: { transcript?: string } };
type SpeechRecognitionEventLike = { results?: ArrayLike<SpeechResult> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

type Props = { onTranscript: (value: string) => void; label: string };

export default function VoiceInputButton({ onTranscript, label }: Props) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const speechWindow = typeof window === "undefined" ? null : window as SpeechWindow;
  const SpeechApi = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;

  useEffect(() => () => recognition.current?.stop(), []);

  if (!SpeechApi) return null;

  const toggle = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    setMessage("");
    const instance = new SpeechApi();
    instance.lang = "pt-BR";
    instance.interimResults = false;
    instance.maxAlternatives = 1;
    instance.onresult = event => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscript(transcript);
      else setMessage("Não entendi. Você pode digitar o local.");
    };
    instance.onerror = () => setMessage("Voz indisponível. Digite o local ou tente novamente.");
    instance.onend = () => setListening(false);
    recognition.current = instance;
    try {
      instance.start();
      setListening(true);
    } catch {
      setListening(false);
      setMessage("Não foi possível iniciar o microfone. Digite o local.");
    }
  };

  return <>
    <button type="button" onClick={toggle} aria-label={listening ? "Parar ditado de " + label : "Ditar " + label} aria-pressed={listening} className={"grid size-10 shrink-0 place-items-center rounded-xl transition-colors " + (listening ? "bg-[#FFB86B]/15 text-[#FFB86B]" : "text-white/45 hover:bg-white/5 hover:text-white")}>
      {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
    </button>
    {message && <span className="sr-only" role="status" aria-live="polite">{message}</span>}
  </>;
}
