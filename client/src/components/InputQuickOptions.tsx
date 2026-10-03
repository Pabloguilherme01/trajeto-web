import { type ReactNode } from "react";

export type InputQuickOption = {
  id: string;
  label: string;
  value: string;
  icon?: ReactNode;
};

type Props = {
  visible: boolean;
  label?: string;
  options: InputQuickOption[];
  onSelect: (option: InputQuickOption) => void;
};

export default function InputQuickOptions({ visible, label = "Opções rápidas", options, onSelect }: Props) {
  if (!visible || options.length === 0) return null;

  return (
    <div className="mt-2 min-w-0" role="group" aria-label={label}>
      <p className="mb-1.5 text-[0.68rem] font-black uppercase tracking-[.12em] text-white/40">{label}</p>
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => onSelect(option)}
            className="inline-flex min-h-10 max-w-[12rem] shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.045] px-3 text-xs font-black text-white/75 active:scale-[.98]"
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
