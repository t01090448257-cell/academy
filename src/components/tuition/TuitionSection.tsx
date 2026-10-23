"use client";

// 연수비용 학비표
// 교육비·기간은 관리자 DB의 현재 적용 가격(PublicTuitionProvider)만 사용합니다. (맞춤견적서와 같은 데이터)
// - 과정별로 관리자에서 "홈페이지 표시"로 지정한 기간(최대 4개)만 표시
// - 기간 선택은 과정 카드마다 따로 합니다. (과정마다 기간이 다르므로 전체 공통 기간 선택은 두지 않음)
//   카드의 기간 목록을 누르면 그 기간의 DB 가격이 크게 표시됩니다. 기본 선택: 4주 → 없으면 첫 표시 기간
// - 그 과정에 없는 기간의 가격을 만들거나 다른 기간 가격으로 대신하지 않습니다.
// - 표시 기간이 없으면 "상담 시 안내"

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Dictionary } from "@/types/dictionary";
import { PROGRAM_GROUPS, PROGRAM_GROUP_ORDER, type ProgramCourseId } from "@/config/programs";
import type { DurationWeeks } from "@/config/pricing";
import { formatKrw } from "@/lib/pricing";
import { getCourseDurations, getCourseTuition, resolveCourseWeeks } from "@/lib/publicTuition";
import { formatWeeks } from "@/lib/weekLabel";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";
import { usePublicTuition } from "@/components/tuition/PublicTuitionProvider";

interface TuitionSectionProps {
  dict: Dictionary;
  /** section: 메인 페이지 독립 섹션 / embedded: 연수비용 페이지 탭 안 */
  variant?: "section" | "embedded";
  /** "예상 비용 계산하기" 버튼 이동 경로 (앵커 또는 URL) */
  calculatorHref?: string;
  /** 링크 대신 클릭 동작이 필요한 경우 (예: 같은 페이지의 탭 전환) */
  onCalculatorClick?: () => void;
}

function PriceCard({
  dict,
  id,
  index,
  large,
}: {
  dict: Dictionary;
  id: ProgramCourseId;
  index: number;
  large: boolean;
}) {
  const { lang, tuition } = usePublicTuition();
  const course = dict.programs.courses[id];
  const t = dict.tuition;
  const isFamily = id === "familyCamp";
  // 이 과정의 표시 기간 중에서만 선택 (기본: 4주 → 없으면 첫 표시 기간)
  const durations = getCourseDurations(tuition, id);
  const [pickedWeeks, setPickedWeeks] = useState<DurationWeeks | null>(null);
  const weeks = resolveCourseWeeks(tuition, id, pickedWeeks);
  const price = getCourseTuition(tuition, id, weeks);
  const weekLabel = (w: DurationWeeks) => formatWeeks(lang, w, t.weeks);

  return (
    <li className={`flex flex-col rounded-2xl border border-sya-ink/8 bg-white ${large ? "p-7 lg:p-9" : "p-6 lg:p-7"}`}>
      <p className="flex items-baseline gap-3">
        <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span lang="en" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sya-navy/55">
          {course.englishName}
        </span>
      </p>
      <h4 className="mt-3 break-keep text-xl font-bold leading-snug text-sya-navy">{course.name}</h4>
      <p className="mt-2 line-clamp-2 break-keep text-sm leading-relaxed text-sya-ink/55">{course.summary}</p>

      {/* 선택된 기간의 교육비 */}
      <div className="mt-6 border-t border-sya-ink/8 pt-5" aria-live="polite">
        <p className="text-[11px] font-semibold text-sya-gold-deep">
          {t.tuitionFeeLabel}
          {weeks !== null && <> · {weekLabel(weeks)}</>}
          {isFamily && <span className="text-sya-ink/45"> · {t.perChild}</span>}
        </p>
        {price !== null ? (
          <p className="mt-2 text-3xl font-light tabular-nums tracking-tight text-sya-navy lg:text-[2.1rem]">
            {formatKrw(price)}
          </p>
        ) : (
          <p className="mt-3 text-lg font-medium text-sya-navy/60">{t.onRequest}</p>
        )}
        {isFamily && <p className="mt-2 break-keep text-xs text-sya-ink/50">{t.familyParentNote}</p>}
      </div>

      {/* 기간별 교육비 (이 과정의 홈페이지 표시 기간만, 최대 4개) — 눌러서 위 금액의 기간 선택 */}
      {durations.length > 0 && (
        <div role="radiogroup" aria-label={`${course.name} · ${t.durationLabel}`} className="mt-6 space-y-1.5">
          {durations.map(({ weeks: w, price: amount }) => {
            const active = w === weeks;
            return (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPickedWeeks(w)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  active ? "bg-sya-navy/[0.05] font-semibold text-sya-navy" : "text-sya-ink/55 hover:bg-sya-navy/[0.03] hover:text-sya-navy"
                }`}
              >
                <span>{weekLabel(w)}</span>
                <span className="tabular-nums">{formatKrw(amount)}</span>
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}

export default function TuitionSection({
  dict,
  variant = "section",
  calculatorHref,
  onCalculatorClick,
}: TuitionSectionProps) {
  const { openConsultation } = useConsultationModal();
  const t = dict.tuition;
  const isSection = variant === "section";

  const calculatorButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-full border border-sya-navy/20 px-7 py-3 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/45 hover:bg-sya-navy/[0.04]";

  return (
    <div>
      {/* 헤더 (기간 선택은 과정 카드별) */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {isSection ? (
            <h2 id="tuition-heading">
              <span
                lang="en"
                className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep"
              >
                <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
                {t.eyebrow}
              </span>
              <span className="mt-5 block break-keep text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl lg:whitespace-pre-line">
                {t.title}
              </span>
            </h2>
          ) : (
            <p
              lang="en"
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep"
            >
              <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
              {t.eyebrow}
            </p>
          )}
          <p className="mt-4 max-w-xl break-keep text-sm leading-relaxed text-sya-ink/60 sm:text-base lg:whitespace-pre-line">
            {t.description}
          </p>
        </div>
      </div>

      {/* 정규반 3 / 캠프반 2 */}
      {PROGRAM_GROUP_ORDER.map((groupId) => {
        const group = dict.programs.groups[groupId];
        const ids = PROGRAM_GROUPS[groupId];
        const isCamp = groupId === "camp";
        return (
          <div key={groupId} className={isSection ? "mt-16" : "mt-12"}>
            <div className="border-t border-sya-ink/10 pt-8">
              <p lang="en" className="text-[10px] font-semibold uppercase tracking-[0.26em] text-sya-gold-deep">
                {group.label}
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-sya-navy">{group.title}</h3>
            </div>
            <ol className={`mt-8 grid gap-5 lg:gap-6 ${isCamp ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {ids.map((id, index) => (
                <PriceCard key={id} dict={dict} id={id} index={index} large={isCamp} />
              ))}
            </ol>
          </div>
        );
      })}

      {/* 안내 + CTA */}
      <div className="mt-10 flex flex-col gap-6 border-t border-sya-ink/10 pt-8 lg:flex-row lg:items-start lg:justify-between">
        <ul className="max-w-2xl space-y-1.5">
          {t.notes.map((note) => (
            <li key={note} className="break-keep text-xs leading-relaxed text-sya-ink/50">
              * {note}
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => openConsultation()}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-sya-navy px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-sya-ink"
          >
            {t.consultCta}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </button>
          {onCalculatorClick ? (
            <button type="button" onClick={onCalculatorClick} className={calculatorButtonClass}>
              {t.calculatorCta}
            </button>
          ) : calculatorHref ? (
            <a href={calculatorHref} className={calculatorButtonClass}>
              {t.calculatorCta}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
