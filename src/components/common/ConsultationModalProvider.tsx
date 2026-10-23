"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/config/i18n";
import type { Dictionary } from "@/types/dictionary";
import ConsultationModal, {
  type CourseId,
  type DurationWeeks,
  type StayOptionId,
} from "./ConsultationModal";
import type { InterestId } from "@/config/consultation";
import type { ConsultationTopic } from "@/config/consultationTopics";

/** 과정 외에 미리 채울 수 있는 값 (계산기 → 상담 연결용) */
export interface ConsultationPrefill {
  stay?: StayOptionId;
  weeks?: DurationWeeks;
  /** "관심 있는 경험" 미리 체크 (예: ["localSchool"]). 교육과정과 별개 */
  interests?: InterestId[];
  /**
   * 특정 프로그램 상담으로 열 때만 사용 (현재 ADHD 맞춤형 영어교육 상세 페이지 전용).
   * 넘기지 않으면 기존 상담 팝업 동작과 완전히 같습니다.
   */
  topic?: ConsultationTopic;
}

interface ConsultationModalContextValue {
  /** 어디서든 이 함수 하나로 상담신청 모달을 열 수 있습니다. course를 넘기면 해당 과정이 미리 선택됩니다. */
  openConsultation: (course?: CourseId, prefill?: ConsultationPrefill) => void;
}

const ConsultationModalContext = createContext<ConsultationModalContextValue | null>(null);

/**
 * 사용 예)
 *   const { openConsultation } = useConsultationModal();
 *   <button onClick={() => openConsultation()}>상담 신청</button>
 *   <button onClick={() => openConsultation("familyCamp")}>가족캠프 상담</button>
 *   <button onClick={() => openConsultation("intensiveEsl", { weeks: 4, stay: "included" })}>계산기 조건으로 상담</button>
 *   <button onClick={() => openConsultation(undefined, { interests: ["cebuMonthStay"] })}>세부 한달살기 상담</button>
 *   <button onClick={() => openConsultation("familyCamp", { interests: ["localSchool"] })}>가족캠프 + 현지 학교 경험 상담</button>
 */
export function useConsultationModal(): ConsultationModalContextValue {
  const ctx = useContext(ConsultationModalContext);
  if (!ctx) {
    throw new Error(
      "useConsultationModal()은 ConsultationModalProvider 내부의 클라이언트 컴포넌트에서만 사용할 수 있습니다."
    );
  }
  return ctx;
}

interface ConsultationModalProviderProps {
  lang: Locale;
  dict: Dictionary;
  children: ReactNode;
}

interface ModalSession {
  /** 열 때마다 증가 → 모달을 새로 마운트해 prefill을 초기값으로 반영 */
  id: number;
  course?: CourseId;
  prefill?: ConsultationPrefill;
}

export default function ConsultationModalProvider({
  lang,
  dict,
  children,
}: ConsultationModalProviderProps) {
  const [session, setSession] = useState<ModalSession | null>(null);
  const openCountRef = useRef(0);

  const openConsultation = useCallback((course?: CourseId, prefill?: ConsultationPrefill) => {
    openCountRef.current += 1;
    setSession({ id: openCountRef.current, course, prefill });
  }, []);

  const closeConsultation = useCallback(() => {
    setSession(null);
  }, []);

  return (
    <ConsultationModalContext.Provider value={{ openConsultation }}>
      {children}
      {session && (
        <ConsultationModal
          key={session.id}
          lang={lang}
          dict={dict}
          onClose={closeConsultation}
          prefillCourse={session.course}
          prefillStay={session.prefill?.stay}
          prefillWeeks={session.prefill?.weeks}
          prefillInterests={session.prefill?.interests}
          topic={session.prefill?.topic}
        />
      )}
    </ConsultationModalContext.Provider>
  );
}
