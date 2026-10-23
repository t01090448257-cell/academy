// src/config/consultationTopics.ts
// 상담 팝업을 "특정 프로그램 상담"으로 열 때 쓰는 값 (현재는 ADHD 맞춤형 영어교육만)
//
// - 기존 정규반·캠프·계산기에서 여는 상담 팝업은 topic을 넘기지 않으므로 동작이 전혀 바뀌지 않습니다.
// - DB·API를 바꾸지 않기 위해, 전용 항목(학생 나이·희망 수업 형태·학습 목표)은 기존 문의사항(message) 컬럼에
//   정해진 형식의 여러 줄 텍스트로 기록합니다. 맨 앞 식별 문구 덕분에 관리자 상담 목록의 기존 검색창에서
//   "ADHD"로 찾을 수 있습니다.
// - message에 기록하는 항목 이름·수업 형태 이름은 관리자 확인용이므로 화면 언어와 관계없이 항상 한국어로 저장합니다.
//   (학습 목표·문의사항은 신청자가 입력한 언어 그대로)

export const CONSULTATION_TOPIC_IDS = ["adhd"] as const;
export type ConsultationTopicId = (typeof CONSULTATION_TOPIC_IDS)[number];

/** 문의사항 맨 앞에 붙는 식별 문구 (모든 언어 공통, 관리자 검색 키워드 "ADHD" 포함) */
export const CONSULTATION_TOPIC_TAGS: Record<ConsultationTopicId, string> = {
  adhd: "[ADHD 맞춤형 영어교육 상담 | ADHD-Friendly English Learning]",
};

/** 희망 수업 형태 */
export const CLASS_FORMAT_IDS = ["oneOnOne", "smallGroup", "undecided"] as const;
export type ClassFormatId = (typeof CLASS_FORMAT_IDS)[number];

/** message에 기록하는 수업 형태 이름 (관리자 확인용, 한국어 고정) */
const CLASS_FORMAT_RECORD_LABELS: Record<ClassFormatId, string> = {
  oneOnOne: "1:1 개인 맞춤 수업",
  smallGroup: "소규모 그룹 수업",
  undecided: "상담 후 결정",
};

/** 학생 나이 입력 범위 (어린이~청소년 대상) */
export const STUDENT_AGE_MIN = 3;
export const STUDENT_AGE_MAX = 19;

/** 입력 길이 상한: 아래 두 값 + 고정 항목을 합쳐도 공개 상담 API의 문의사항 상한(5,000자) 안에 들어가도록 설정 */
export const TOPIC_GOAL_MAX = 1000;
export const TOPIC_MESSAGE_MAX = 3500;

/**
 * 학생 나이 → 기존 구분/연령(age_group) 값.
 * 공개 상담 API가 허용하는 기존 값(child / teen)만 사용합니다. (12세 이하 = 초등학생 이하, 13세 이상 = 중고등학생)
 */
export function studentAgeGroup(age: number): "child" | "teen" {
  return age <= 12 ? "child" : "teen";
}

/** 팝업에 표시할 문구 (화면 언어로 번역된 값을 여는 쪽에서 넘김) */
export interface ConsultationTopic {
  id: ConsultationTopicId;
  /** 팝업 제목 (기존 공용 제목 대신 표시) */
  title: string;
  /** 입력란 위 안내 문구 */
  notice: string;
  studentAgeLabel: string;
  studentAgePlaceholder: string;
  classFormatLabel: string;
  classFormats: Record<ClassFormatId, string>;
  /** 영어 수준 항목 이름 (학생 기준) */
  levelLabel: string;
  goalLabel: string;
  goalPlaceholder: string;
  /** 문의사항 입력란 예시 문구 (기존 팝업의 가족캠프 예시 대신) */
  messagePlaceholder: string;
}

export interface TopicMessageInput {
  studentAge: number;
  classFormat: ClassFormatId;
  goal: string;
  message: string;
}

/**
 * message 컬럼에 저장할 텍스트 (관리자 상담 상세의 "상담 내용"에 줄바꿈 그대로 표시됨)
 *
 *   [ADHD 맞춤형 영어교육 상담 | ADHD-Friendly English Learning]
 *   학생 나이: 9세
 *   희망 수업 형태: 1:1 개인 맞춤 수업
 *   학습 목표: ...
 *   문의사항: ...
 */
export function buildTopicMessage(topicId: ConsultationTopicId, input: TopicMessageInput): string {
  const goal = input.goal.trim();
  const message = input.message.trim();
  return [
    CONSULTATION_TOPIC_TAGS[topicId],
    `학생 나이: ${input.studentAge}세`,
    `희망 수업 형태: ${CLASS_FORMAT_RECORD_LABELS[input.classFormat]}`,
    `학습 목표: ${goal || "-"}`,
    `문의사항: ${message || "-"}`,
  ].join("\n");
}
