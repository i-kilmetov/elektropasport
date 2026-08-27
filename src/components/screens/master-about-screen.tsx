"use client";

import { useState } from "react";
import {
  MASTER_YELLOW_BTN,
  MasterApplyFrame,
} from "@/components/master-apply/master-apply-frame";
import { Button } from "@/components/ui/button";

const MAX_ABOUT_LENGTH = 2000;

export function MasterAboutScreen({
  onBack,
  onConfirm,
  initialValue = "",
}: {
  onBack: () => void;
  onConfirm: (about: string) => void;
  initialValue?: string;
}) {
  const [about, setAbout] = useState(initialValue);
  const trimmed = about.trim();

  return (
    <MasterApplyFrame
      onBack={onBack}
      title="Стать мастером"
      footer={
        <Button
          className={`w-full ${MASTER_YELLOW_BTN}`}
          size="lg"
          disabled={!trimmed}
          onClick={() => onConfirm(trimmed)}
        >
          Продолжить
        </Button>
      }
    >
      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-white">
        Рассказать о себе
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-white/55">
        Коротко напишите об опыте и о том, с какими работами обычно берётесь.
        Образование уже подтверждено документами и экзаменом.
      </p>

      <textarea
        value={about}
        onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT_LENGTH))}
        rows={8}
        placeholder="Например: электрик с опытом 8 лет, работаю с квартирами и частными домами"
        className="mb-2 w-full resize-none rounded-[20px] border border-white/12 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-white/30"
      />
      <div className="mb-4 text-right text-[12px] text-white/35">
        {about.length}/{MAX_ABOUT_LENGTH}
      </div>
    </MasterApplyFrame>
  );
}
