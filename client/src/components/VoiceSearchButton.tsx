import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { startVoiceSearch } from "@/lib/mobileTools";

type Props = {
  onResult: (text: string) => void;
  label?: string;
};

export default function VoiceSearchButton({ onResult, label = "Pesquisar por voz" }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const start = () => {
    if (listening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const recognition = startVoiceSearch(
      text => {
        setListening(false);
        recognitionRef.current = null;
        onResult(text);
      },
      () => {
        setListening(false);
        recognitionRef.current = null;
      },
    );

    if (!recognition) return;
    recognitionRef.current = recognition;
    setListening(true);
  };

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  const supported = typeof window !== "undefined" && Boolean(
    (window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    }).SpeechRecognition ||
    (window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    }).webkitSpeechRecognition,
  );

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={start}
      className="mobile-action-icon shrink-0 border-white/8 bg-white/[.025] text-white/55"
      aria-label={listening ? "Parar pesquisa por voz" : label}
      aria-pressed={listening}
      title={listening ? "Ouvindo…" : label}
    >
      {listening ? <MicOff className="size-4 text-[#FFB86B]" /> : <Mic className="size-4" />}
    </button>
  );
}
