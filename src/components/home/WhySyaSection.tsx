import { BedDouble, MessageCircle, School, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/types/dictionary";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";

interface WhySyaSectionProps {
  dict: Dictionary;
}

type WhySyaKey = keyof Dictionary["whySya"]["items"];

/** 카드 순서와 보조 아이콘 (아이콘은 작게, typography가 중심) */
const WHY_ORDER: { key: WhySyaKey; Icon: LucideIcon }[] = [
  { key: "speakingFirst", Icon: MessageCircle },
  { key: "realEnglishLife", Icon: School },
  { key: "premiumStay", Icon: BedDouble },
];

export default function WhySyaSection({ dict }: WhySyaSectionProps) {
  const { title, subtitle, items } = dict.whySya;

  return (
    <section aria-labelledby="why-sya-heading" className="bg-sya-soft">
      <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
        {/* 섹션 헤더 */}
        <h2 id="why-sya-heading" className="max-w-2xl">
          <span
            lang="en"
            className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep"
          >
            <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
            {title}
          </span>
          <span className="mt-5 block break-keep text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl">
            {subtitle}
          </span>
        </h2>

        {/* 3개 컬럼 */}
        <ol className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-16 lg:gap-6">
          {WHY_ORDER.map(({ key, Icon }, index) => {
            const item = items[key];
            return (
              <li
                key={key}
                className="group flex flex-col rounded-2xl border border-sya-ink/8 bg-white p-8 transition-colors duration-300 hover:border-sya-gold/45 lg:p-10"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="h-5 w-5 text-sya-navy/35 transition-colors duration-300 group-hover:text-sya-gold-deep"
                  />
                </div>

                <p lang="en" className="mt-10 font-serif text-2xl italic text-sya-navy lg:text-[1.7rem]">
                  {item.englishTitle}
                </p>
                <h3 className="mt-3 break-keep text-lg font-bold leading-snug text-sya-ink">
                  {item.title}
                </h3>

                <span aria-hidden="true" className="mt-6 h-px w-8 bg-sya-gold/70" />

                <p className="mt-6 break-keep text-sm leading-relaxed text-sya-ink/60">
                  {item.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
