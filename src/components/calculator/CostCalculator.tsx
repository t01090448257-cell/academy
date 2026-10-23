"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { Dictionary } from "@/types/dictionary";
import { PROGRAM_GROUPS, PROGRAM_GROUP_ORDER } from "@/config/programs";
import {
  PARTICIPANT_TYPE_IDS,
  STAY_OPTION_IDS,
  isCourseId,
  type CourseId,
  type ParticipantTypeId,
  type StayOptionId,
} from "@/config/courses";
import { PRICING_DATA, type DurationWeeks } from "@/config/pricing";
import { calculateEstimate, formatKrw, type EstimateLine } from "@/lib/pricing";
import { getCourseDurations, resolveCourseWeeks } from "@/lib/publicTuition";
import { formatWeeks } from "@/lib/weekLabel";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";
import { usePublicTuition } from "@/components/tuition/PublicTuitionProvider";

// 다른 파일에서 "@/components/calculator/CostCalculator"의 CourseId를 가져다 쓸 수 있도록 재수출
export type { CourseId };

interface CostCalculatorProps {
  lang: Locale;
  dict: Dictionary;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function Step({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-sya-ink/8 pt-5 first:border-t-0 first:pt-0">
      <legend className="flex items-baseline gap-3">
        <span aria-hidden="true" className="text-[11px] font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
          {String(index).padStart(2, "0")}
        </span>
        <span className="text-sm font-bold text-sya-navy">{title}</span>
      </legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function Choice({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-start text-sm transition-colors ${
        active
          ? "border-sya-navy bg-sya-navy font-semibold text-white"
          : "border-sya-ink/12 bg-white text-sya-ink/75 hover:border-sya-navy/35"
      } ${className}`}
    >
      {children}
    </button>
  );
}

// 실시간 맞춤견적서
// 교육비·기간 선택지는 학비표와 같은 관리자 DB 데이터(PublicTuitionProvider)를 사용합니다.
// 기간 선택 목록 = 선택한 과정에서 관리자가 "홈페이지 표시"로 지정한 기간 (최대 4개)
export default function CostCalculator({ lang, dict }: CostCalculatorProps) {
  const searchParams = useSearchParams();
  const { openConsultation } = useConsultationModal();
  const { tuition } = usePublicTuition();
  const e = dict.estimator;
  const t = dict.tuition;
  const limits = PRICING_DATA.familyLimits;

  // ?course= 로 들어오면 해당 과정을 초기 선택 (마운트 시 1회)
  const [courseId, setCourseId] = useState<CourseId>(() => {
    const param = searchParams.get("course");
    return isCourseId(param) ? param : "intensiveEsl";
  });
  const [pickedWeeks, setPickedWeeks] = useState<DurationWeeks | null>(null);
  const [participantType, setParticipantType] = useState<ParticipantTypeId>("adult");
  const [childCount, setChildCount] = useState(1);
  const [parentCount, setParentCount] = useState(0);
  const [stay, setStay] = useState<StayOptionId>("included");

  // 과정을 바꿨을 때 이전 기간이 이 과정에 없으면 이 과정의 대표 기간(4주 → 첫 기간)으로
  const durations = getCourseDurations(tuition, courseId);
  const weeks = resolveCourseWeeks(tuition, courseId, pickedWeeks);

  const isFamily = PRICING_DATA.courses[courseId].kind === "family";
  const estimate = calculateEstimate(
    {
      courseId,
      weeks,
      childCount: isFamily ? childCount : 1,
      parentCount: isFamily ? parentCount : 0,
      stay,
    },
    tuition
  );

  const weekLabel = (w: DurationWeeks) => formatWeeks(lang, w, t.weeks);
  const amountText = (amount: number | null) => (amount !== null ? formatKrw(amount) : t.onRequest);

  const allLines: EstimateLine[] = [
    ...estimate.education,
    ...(estimate.stay ? [estimate.stay] : []),
    ...estimate.options,
  ];

  function lineLabel(line: EstimateLine, position: number): string {
    switch (line.key) {
      case "tuition":
        return `${e.lines.tuition} · ${dict.programs.courses[courseId].name}`;
      case "additionalChild":
        return `${e.lines.additionalChild} × ${line.quantity}`;
      case "parent": {
        const order = allLines.slice(0, position + 1).filter((l) => l.key === "parent").length;
        return `${e.lines.parent} ${order}`;
      }
      case "stay":
        return e.lines.stay;
      case "option": {
        const option = PRICING_DATA.additionalOptions.find((o) => o.id === line.optionId);
        return option?.name[lang] ?? option?.name.en ?? e.lines.option;
      }
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* 선택 영역 */}
      <div className="space-y-6 lg:col-span-7">
        <Step index={1} title={e.steps.course}>
          <div className="space-y-4">
            {PROGRAM_GROUP_ORDER.map((groupId) => (
              <div key={groupId}>
                <p lang="en" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sya-ink/40">
                  {dict.programs.groups[groupId].label}
                </p>
                <div role="radiogroup" aria-label={dict.programs.groups[groupId].title} className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PROGRAM_GROUPS[groupId].map((id) => (
                    <Choice key={id} active={courseId === id} onClick={() => setCourseId(id)}>
                      {dict.programs.courses[id].name}
                    </Choice>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Step>

        <Step index={2} title={e.steps.duration}>
          {durations.length > 0 ? (
            <div role="radiogroup" aria-label={e.steps.duration} className="grid grid-cols-4 gap-2">
              {durations.map(({ weeks: w }) => (
                <Choice key={w} active={weeks === w} onClick={() => setPickedWeeks(w)} className="text-center">
                  {weekLabel(w)}
                </Choice>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-sya-ink/12 bg-white px-4 py-2.5 text-sm text-sya-ink/60">{t.onRequest}</p>
          )}
        </Step>

        <Step index={3} title={e.steps.participant}>
          {isFamily ? (
            <div>
              <p className="text-xs text-sya-ink/55">{e.childCountLabel}</p>
              <div role="radiogroup" aria-label={e.childCountLabel} className="mt-2 flex gap-2">
                {range(1, limits.maxChildren).map((n) => (
                  <Choice key={n} active={childCount === n} onClick={() => setChildCount(n)} className="w-14 text-center">
                    {n}
                  </Choice>
                ))}
              </div>
            </div>
          ) : (
            <div role="radiogroup" aria-label={e.steps.participant} className="grid grid-cols-2 gap-2">
              {PARTICIPANT_TYPE_IDS.map((id) => (
                <Choice key={id} active={participantType === id} onClick={() => setParticipantType(id)}>
                  {e.participantTypes[id]}
                </Choice>
              ))}
            </div>
          )}
        </Step>

        <Step index={4} title={e.steps.stay}>
          <div role="radiogroup" aria-label={e.steps.stay} className="grid grid-cols-2 gap-2">
            {STAY_OPTION_IDS.map((id) => (
              <Choice key={id} active={stay === id} onClick={() => setStay(id)}>
                {e.stayOptions[id]}
              </Choice>
            ))}
          </div>
          <p className="mt-2 break-keep text-xs text-sya-ink/50">{e.stayNote}</p>
        </Step>

        {isFamily && (
          <Step index={5} title={e.steps.parents}>
            <p className="text-xs text-sya-ink/55">{e.parentCountLabel}</p>
            <div role="radiogroup" aria-label={e.parentCountLabel} className="mt-2 flex gap-2">
              {range(0, limits.maxParents).map((n) => (
                <Choice key={n} active={parentCount === n} onClick={() => setParentCount(n)} className="w-14 text-center">
                  {n}
                </Choice>
              ))}
            </div>
          </Step>
        )}
      </div>

      {/* 예상 비용 */}
      <div className="lg:col-span-5">
        <div className="rounded-2xl bg-sya-navy p-6 text-white lg:sticky lg:top-24 lg:p-8" aria-live="polite">
          <p lang="en" className="text-[10px] font-semibold uppercase tracking-[0.26em] text-sya-gold">
            ESTIMATE
          </p>
          <p className="mt-2 text-lg font-bold">{e.summaryTitle}</p>
          <p className="mt-1 text-xs text-white/55">
            {dict.programs.courses[courseId].name} · {weeks !== null ? weekLabel(weeks) : t.onRequest}
          </p>

          <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
            {allLines.map((line, i) => (
              <div key={`${line.key}-${i}`} className="flex items-start justify-between gap-4">
                <dt className="break-keep text-white/70">{lineLabel(line, i)}</dt>
                <dd className={`shrink-0 tabular-nums ${line.amount !== null ? "font-semibold" : "text-white/55"}`}>
                  {amountText(line.amount)}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 border-t border-white/10 pt-5">
            {estimate.tuitionPending ? (
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold">{e.totalLabel}</span>
                <span className="text-lg font-semibold text-sya-gold">{t.onRequest}</span>
              </div>
            ) : (
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold">{estimate.hasPending ? e.knownTotalLabel : e.totalLabel}</span>
                <span className="text-2xl font-light tabular-nums tracking-tight text-sya-gold">
                  {formatKrw(estimate.knownTotal)}
                </span>
              </div>
            )}
            <p className="mt-3 break-keep text-[11px] leading-relaxed text-white/45">{e.totalNote}</p>
          </div>

          <button
            type="button"
            onClick={() => openConsultation(courseId, { stay, weeks: weeks ?? undefined })}
            className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-sya-navy transition-colors hover:bg-sya-soft"
          >
            {e.consultCta}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
