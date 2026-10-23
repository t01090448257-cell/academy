"use client";

import type { ReactNode } from "react";
import type { CourseId } from "@/config/courses";
import { useConsultationModal, type ConsultationPrefill } from "@/components/common/ConsultationModalProvider";

interface ConsultButtonProps {
  /** 미리 선택할 교육과정 (선택) */
  course?: CourseId;
  /** 미리 선택할 기간·숙박·관심 경험 (선택) */
  prefill?: ConsultationPrefill;
  className?: string;
  children: ReactNode;
}

/**
 * 서버 컴포넌트(예: LiveLearnSection)에서도 상담 모달을 열 수 있게 해 주는 작은 버튼.
 * 스타일은 호출하는 쪽의 className을 그대로 사용합니다.
 */
export default function ConsultButton({ course, prefill, className, children }: ConsultButtonProps) {
  const { openConsultation } = useConsultationModal();
  return (
    <button type="button" onClick={() => openConsultation(course, prefill)} className={className}>
      {children}
    </button>
  );
}
