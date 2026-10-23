"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { isRtlLocale, type Locale } from "@/config/i18n";
import { isolateLtrDeep } from "@/lib/bidi";
import type { Dictionary } from "@/types/dictionary";
import { COURSE_IDS, STAY_OPTION_IDS, type CourseId, type StayOptionId } from "@/config/courses";
import { PROGRAM_GROUPS, PROGRAM_GROUP_ORDER } from "@/config/programs";
import type { DurationWeeks } from "@/config/pricing";
import { INTEREST_IDS, normalizeInterests, type InterestId } from "@/config/consultation";
import {
  CLASS_FORMAT_IDS,
  STUDENT_AGE_MAX,
  STUDENT_AGE_MIN,
  TOPIC_GOAL_MAX,
  TOPIC_MESSAGE_MAX,
  buildTopicMessage,
  studentAgeGroup,
  type ClassFormatId,
  type ConsultationTopic,
} from "@/config/consultationTopics";
import { getCourseDurations, resolveCourseWeeks } from "@/lib/publicTuition";
import { formatWeeks } from "@/lib/weekLabel";
import { usePublicTuition } from "@/components/tuition/PublicTuitionProvider";

// 다른 파일에서 "@/components/common/ConsultationModal"에서 가져다 쓸 수 있도록 재수출합니다.
// 실제 정의는 @/config/courses.ts, @/config/pricing.ts 입니다.
// 희망 연수 기간 목록은 코드에 고정하지 않고, 과정별 관리자 "홈페이지 표시" 기간(학비표·맞춤견적서와 동일)을 사용합니다.
export { COURSE_IDS, STAY_OPTION_IDS };
export type { CourseId, StayOptionId, DurationWeeks };

/* ------------------------------------------------------------------ */
/* 상담 채널 연동 설정                                                   */
/* ------------------------------------------------------------------ */
// ⚠️ TODO: 실제 SYA 카카오톡 채널 URL로 교체하세요.
// 이 값이 사이트에서 유일한 카카오톡 채널 URL 소스입니다 (ConsultSidebarCard.tsx 등에서 import해서 재사용).
export const CONSULT_CHANNEL_URL = "https://pf.kakao.com/_xxxxxxx/chat";

export const AGE_GROUP_IDS = ["adult", "teen", "child", "parent"] as const;
export type AgeGroupId = (typeof AGE_GROUP_IDS)[number];

export const ENGLISH_LEVEL_IDS = ["beginner", "intermediate", "advanced"] as const;
export type EnglishLevelId = (typeof ENGLISH_LEVEL_IDS)[number];

interface ConsultationModalProps {
  lang: Locale;
  dict: Dictionary;
  onClose: () => void;
  /** 프로그램 상세·계산기 등에서 과정을 미리 선택해서 열고 싶을 때 */
  prefillCourse?: CourseId;
  /** 계산기에서 숙박 여부를 미리 선택해서 열고 싶을 때 */
  prefillStay?: StayOptionId;
  /** 계산기에서 연수 기간을 미리 선택해서 열고 싶을 때 */
  prefillWeeks?: DurationWeeks;
  /** "관심 있는 경험"을 미리 체크해서 열고 싶을 때 (교육과정과 별개) */
  prefillInterests?: InterestId[];
  /**
   * 특정 프로그램 상담 (현재 ADHD 맞춤형 영어교육 상세 페이지에서만 넘김).
   * 있을 때만: 팝업 제목을 프로그램 상담 제목으로 바꾸고 안내 문구 표시, 여행·숙박 관련 항목(구분/연령·교육과정·연수 기간·관심 있는 경험·숙박) 대신
   * 학생 나이·희망 수업 형태·학습 목표를 받고, 전용 항목은 문의사항(message)에 정해진 형식으로 기록합니다.
   * 없으면 기존 동작 그대로입니다.
   */
  topic?: ConsultationTopic;
}

interface ModalCopy {
  eyebrow: string;
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  ageGroupLabel: string;
  contactLabel: string;
  contactPlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  courseLabel: string;
  durationLabel: string;
  startDateLabel: string;
  levelLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
  cancelButton: string;
  submitButton: string;
  privacyNote: string;
  successTitle: string;
  successMessage: (phone: string) => string;
  /** 상담 저장(API) 실패 시 모달 안에 표시하는 기본 오류 문구 */
  submitError: string;
  ageGroups: Record<AgeGroupId, string>;
  levels: Record<EnglishLevelId, string>;
}

/* ------------------------------------------------------------------ */
/* 내부 번역 맵 (ko / en). 그 외 6개 언어는 en으로 폴백 — AdmissionForm.tsx와 동일 패턴 */
/* ------------------------------------------------------------------ */
const translations: Record<"ko" | "en", ModalCopy> = {
  ko: {
    eyebrow: "SYA 1:1 맞춤 견적 & 입학상담 신청",
    title: "무료 견적서 및 입학 상담 접수",
    description:
      "신청 완료 즉시 SYA 학사 관리 시스템에 접수되며, 전문 상담 매니저가 맞춤 견적서를 안내해 드립니다.",
    nameLabel: "학생 성함",
    namePlaceholder: "예: 김민수",
    ageGroupLabel: "구분 / 연령",
    contactLabel: "연락처 (휴대폰 번호)",
    contactPlaceholder: "010-XXXX-XXXX",
    emailLabel: "이메일 (견적서 수신)",
    emailPlaceholder: "example@email.com",
    courseLabel: "희망 교육과정",
    durationLabel: "희망 연수 기간",
    startDateLabel: "희망 과정 시작 시기",
    levelLabel: "현재 본인의 영어 수준",
    messageLabel: "궁금하신 점이나 추가 요청사항",
    messagePlaceholder: "예: 가족캠프 부모 동반 비용과 숙박 가능 여부가 궁금합니다.",
    cancelButton: "취소",
    submitButton: "상담 신청서 제출",
    privacyNote: "* 개인정보는 상담 목적으로만 안전하게 사용됩니다.",
    successTitle: "상담 신청이 접수되었습니다!",
    successMessage: (phone) =>
      `작성해 주신 연락처(${phone})로 SYA 전담 매니저가 빠른 시간 내에 연락드리겠습니다.`,
    submitError: "상담 신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    ageGroups: {
      adult: "성인 / 대학생",
      teen: "중고등학생",
      child: "초등학생 이하",
      parent: "학부모 / 보호자 문의",
    },
    levels: {
      beginner: "초급",
      intermediate: "중급",
      advanced: "고급",
    },
  },
  en: {
    eyebrow: "SYA 1:1 Custom Quote & Admission Consultation",
    title: "Free Quote & Admission Consultation",
    description:
      "As soon as you submit, it's logged in SYA's admissions system and a dedicated manager will send you a tailored quote.",
    nameLabel: "Student's Name",
    namePlaceholder: "e.g. Jane Doe",
    ageGroupLabel: "Category / Age Group",
    contactLabel: "Contact Number",
    contactPlaceholder: "e.g. +1 555-123-4567",
    emailLabel: "Email (to receive your quote)",
    emailPlaceholder: "example@email.com",
    courseLabel: "Preferred Course",
    durationLabel: "Preferred Duration",
    startDateLabel: "Preferred Course Start",
    levelLabel: "Your Current English Level",
    messageLabel: "Questions or Additional Requests",
    messagePlaceholder: "e.g. I'd like to know the cost for an accompanying parent and whether accommodation is available.",
    cancelButton: "Cancel",
    submitButton: "Submit Application",
    privacyNote: "* Your information is used only for consultation purposes.",
    successTitle: "Your consultation request has been received!",
    successMessage: (phone) =>
      `A dedicated SYA manager will reach out to you soon at ${phone}.`,
    submitError: "We couldn't submit your request. Please try again in a moment.",
    ageGroups: {
      adult: "Adult / University Student",
      teen: "Middle / High School Student",
      child: "Elementary School or Younger",
      parent: "Parent / Guardian Inquiry",
    },
    levels: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
  },
};

function resolveCopy(lang: Locale): ModalCopy {
  return lang === "ko" ? translations.ko : translations.en;
}

// RTL(ar) 화면 표시용: 영문 폴백 문구("1:1", "*", "?" 등)가 뒤섞이지 않도록 격리한 사본.
// 카카오톡으로 복사되는 상담 요약문은 격리 문자 없이 resolveCopy() 원문을 그대로 사용한다.
const TRANSLATIONS_EN_RTL = isolateLtrDeep(translations.en);

function resolveDisplayCopy(lang: Locale): ModalCopy {
  if (lang !== "ko" && isRtlLocale(lang)) return TRANSLATIONS_EN_RTL;
  return resolveCopy(lang);
}

export default function ConsultationModal({
  lang,
  dict,
  onClose,
  prefillCourse,
  prefillStay,
  prefillWeeks,
  prefillInterests,
  topic,
}: ConsultationModalProps) {
  const t = resolveDisplayCopy(lang);
  const tMessage = resolveCopy(lang);
  const courseName = (id: CourseId) => dict.programs.courses[id].name;
  const { tuition } = usePublicTuition();
  const weekLabel = (w: DurationWeeks | null) => (w !== null ? formatWeeks(lang, w, dict.tuition.weeks) : dict.tuition.onRequest);

  // 모달은 열릴 때마다 새로 마운트되므로(Provider의 key) 초기값이 곧 prefill 값입니다.
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroupId>(AGE_GROUP_IDS[0]);
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState<CourseId>(prefillCourse ?? COURSE_IDS[0]);
  const [pickedWeeks, setPickedWeeks] = useState<DurationWeeks | null>(prefillWeeks ?? null);
  const [stay, setStay] = useState<StayOptionId>(prefillStay ?? STAY_OPTION_IDS[0]);
  // 관심 있는 경험: 복수 선택, 추후 DB 저장을 위해 ID 배열로 유지 (예: ["cebuMonthStay", "localSchool"])
  const [interests, setInterests] = useState<InterestId[]>(() => normalizeInterests(prefillInterests));
  const [startDate, setStartDate] = useState("");
  const [level, setLevel] = useState<EnglishLevelId>("beginner");
  const [message, setMessage] = useState("");
  // ADHD 등 topic 상담 전용 항목 (topic이 없으면 사용하지 않음)
  const [studentAge, setStudentAge] = useState("");
  const [classFormat, setClassFormat] = useState<ClassFormatId>("undecided");
  const [goal, setGoal] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  // 상담 저장(API) 요청 중 여부 · 실패 메시지 (실패해도 입력값은 그대로 유지)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 같은 렌더 안에서 빠르게 두 번 누르는 경우까지 막기 위한 즉시 잠금
  const submittingRef = useRef(false);
  // 선택한 과정에 없는 기간이면 그 과정의 대표 기간(4주 → 첫 기간), 표시 기간이 없으면 null("상담 시 안내")
  const durations = getCourseDurations(tuition, courseId);
  const weeks = resolveCourseWeeks(tuition, courseId, pickedWeeks);

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function toggleInterest(id: InterestId) {
    setInterests((prev) => normalizeInterests(prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    // topic 상담(ADHD): 기존 공개 상담 API 형식 그대로, 과정·기간·숙박·관심 경험은 비우고
    // 전용 항목은 message에 기록 (구분/연령은 학생 나이로 기존 허용값 child/teen 중 하나)
    const topicAge = topic ? Number(studentAge) : null;
    if (topic && !(Number.isInteger(topicAge) && topicAge! >= STUDENT_AGE_MIN && topicAge! <= STUDENT_AGE_MAX)) {
      // 입력란의 required·min·max로 브라우저가 먼저 막으므로 여기까지 오는 경우는 거의 없음
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const topicMessage =
      topic && topicAge !== null ? buildTopicMessage(topic.id, { studentAge: topicAge, classFormat, goal, message }) : null;
    const requestBody = topic
      ? {
          name,
          phone: contact,
          email: email || null,
          ageGroup: studentAgeGroup(topicAge ?? 0),
          course: null,
          durationWeeks: null,
          stayOption: null,
          startDate: startDate || null,
          englishLevel: level,
          interests: [],
          message: topicMessage,
          locale: lang,
        }
      : {
          name,
          phone: contact,
          email: email || null,
          ageGroup,
          course: courseId,
          durationWeeks: weeks,
          stayOption: stay,
          startDate: startDate || null,
          englishLevel: level,
          interests,
          message: message || null,
          locale: lang,
        };

    // 1) 공개 상담 API에 저장 — 201 + {"ok":true}를 받은 경우에만 아래 성공 처리·카카오톡 연결을 진행
    let saved = false;
    let apiMessage: string | null = null;
    try {
      const response = await fetch("/api/public/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const result: unknown = await response.json().catch(() => null);
      const body = result && typeof result === "object" ? (result as { ok?: unknown; message?: unknown }) : null;
      saved = response.status === 201 && body?.ok === true;
      if (!saved && typeof body?.message === "string" && body.message.trim()) {
        apiMessage = body.message.trim();
      }
    } catch (error) {
      console.error("상담 신청 저장 요청 실패:", error);
    }

    if (!saved) {
      // 저장 실패: 카카오톡을 열지 않고, 입력값을 유지한 채 다시 제출할 수 있게 함
      // API 오류 문구는 한국어이므로 한국어 화면에서만 그대로 보여 주고, 그 외 언어는 기본 문구를 사용
      setSubmitError(lang === "ko" && apiMessage ? apiMessage : t.submitError);
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // 2) 저장 성공 → 성공 화면
    setIsSuccess(true);

    // 3) 기존 처리 그대로: 상담 요약 클립보드 복사 → 카카오톡 채널 열기
    const summaryText = topic
      ? [
          `[${topic.title}]`,
          `${tMessage.nameLabel}: ${name}`,
          `${topic.studentAgeLabel}: ${studentAge}`,
          `${tMessage.contactLabel}: ${contact}`,
          `${tMessage.emailLabel}: ${email || "-"}`,
          `${topic.classFormatLabel}: ${topic.classFormats[classFormat]}`,
          `${tMessage.startDateLabel}: ${startDate || "-"}`,
          `${topic.levelLabel}: ${tMessage.levels[level]}`,
          `${topic.goalLabel}: ${goal.trim() || "-"}`,
          `${tMessage.messageLabel}: ${message.trim() || "-"}`,
        ].join("\n")
      : [
      `[${tMessage.eyebrow}]`,
      `${tMessage.nameLabel}: ${name}`,
      `${tMessage.ageGroupLabel}: ${tMessage.ageGroups[ageGroup]}`,
      `${tMessage.contactLabel}: ${contact}`,
      `${tMessage.emailLabel}: ${email || "-"}`,
      `${tMessage.courseLabel}: ${courseName(courseId)}`,
      `${dict.consultation.interestsLabel}: ${
        interests.length ? interests.map((id) => dict.consultation.interests[id]).join(", ") : dict.consultation.noneLabel
      }`,
      `${tMessage.durationLabel}: ${weekLabel(weeks)}`,
      `${dict.estimator.steps.stay}: ${dict.estimator.stayOptions[stay]}`,
      `${tMessage.startDateLabel}: ${startDate || "-"}`,
      `${tMessage.levelLabel}: ${tMessage.levels[level]}`,
      `${tMessage.messageLabel}: ${message || "-"}`,
    ].join("\n");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = summaryText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.error("상담 신청 정보 클립보드 복사 실패:", error);
    } finally {
      window.open(CONSULT_CHANNEL_URL, "_blank", "noopener,noreferrer");
    }

    // 닫히면 모달이 언마운트되어 입력값은 자동으로 초기화됩니다.
    setTimeout(onClose, 2200);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95">
        {/* 모달 헤더 */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-amber-300 text-xs font-bold mb-1">
              <span>✦</span>
              <span>{t.eyebrow}</span>
            </div>
            <h3 className="text-xl font-black">{topic ? topic.title : t.title}</h3>
            <p className="text-xs text-sky-100 mt-1">{t.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M4 4L14 14M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <path
                  d="M9 18.5L15 24.5L27 11.5"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h4 className="text-xl font-black text-slate-900">{t.successTitle}</h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {t.successMessage(contact)}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 text-xs sm:text-sm max-h-[75vh] overflow-y-auto"
          >
            {/* 특정 프로그램 상담 안내 (ADHD 맞춤형 영어교육 페이지에서 열었을 때만) */}
            {topic && (
              <p className="px-3 py-2.5 rounded-lg border border-sky-200 bg-sky-50 text-[11px] leading-relaxed text-sky-800">
                {topic.notice}
              </p>
            )}

            {/* 성함 + 구분/연령 (topic 상담: 성함 + 학생 나이) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.nameLabel} *</label>
                <input
                  type="text"
                  required
                  placeholder={t.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              {topic ? (
                <div>
                  <label htmlFor="consult-student-age" className="font-bold text-slate-700 block mb-1">
                    {topic.studentAgeLabel} *
                  </label>
                  <input
                    id="consult-student-age"
                    type="number"
                    inputMode="numeric"
                    dir="ltr"
                    required
                    min={STUDENT_AGE_MIN}
                    max={STUDENT_AGE_MAX}
                    step={1}
                    placeholder={topic.studentAgePlaceholder}
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              ) : (
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ageGroupLabel}</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value as AgeGroupId)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  {AGE_GROUP_IDS.map((id) => (
                    <option key={id} value={id}>
                      {t.ageGroups[id]}
                    </option>
                  ))}
                </select>
              </div>
              )}
            </div>

            {/* 연락처 + 이메일 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.contactLabel} *</label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  placeholder={t.contactPlaceholder}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.emailLabel}</label>
                <input
                  type="email"
                  dir="ltr"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {topic ? (
              <>
                {/* topic 상담: 희망 수업 형태 (여행·숙박·교육과정 선택 대신) */}
                <fieldset>
                  <legend className="font-bold text-slate-700 block mb-1.5">{topic.classFormatLabel}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {CLASS_FORMAT_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={classFormat === id}
                        onClick={() => setClassFormat(id)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                          classFormat === id
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {topic.classFormats[id]}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* 희망 시작 시기 */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t.startDateLabel}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full sm:w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
              </>
            ) : (
              <>
            {/* 희망 코스 + 희망 연수 기간 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.courseLabel}</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value as CourseId)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  {PROGRAM_GROUP_ORDER.map((groupId) => (
                    <optgroup key={groupId} label={dict.programs.groups[groupId].title}>
                      {PROGRAM_GROUPS[groupId].map((id) => (
                        <option key={id} value={id}>
                          {courseName(id)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.durationLabel}</label>
                <select
                  value={weeks ?? ""}
                  onChange={(e) => setPickedWeeks(e.target.value ? Number(e.target.value) : null)}
                  disabled={durations.length === 0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  {durations.length === 0 ? (
                    <option value="">{dict.tuition.onRequest}</option>
                  ) : (
                    durations.map(({ weeks: w }) => (
                      <option key={w} value={w}>
                        {weekLabel(w)}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* 관심 있는 경험 (복수 선택, 교육과정과 별개) */}
            <fieldset>
              <legend className="font-bold text-slate-700 block mb-1.5">{dict.consultation.interestsLabel}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INTEREST_IDS.map((id) => {
                  const checked = interests.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        checked
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="interests"
                        value={id}
                        checked={checked}
                        onChange={() => toggleInterest(id)}
                        className="h-3.5 w-3.5 accent-sky-600"
                      />
                      {dict.consultation.interests[id]}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* 숙박 여부 + 희망 과정 시작 시기 (숙소 입실일과는 별도) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{dict.estimator.steps.stay}</label>
                <select
                  value={stay}
                  onChange={(e) => setStay(e.target.value as StayOptionId)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  {STAY_OPTION_IDS.map((id) => (
                    <option key={id} value={id}>
                      {dict.estimator.stayOptions[id]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.startDateLabel}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                />
              </div>
            </div>

              </>
            )}

            {/* 현재 영어 수준 */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">{topic ? topic.levelLabel : t.levelLabel}</label>
              <div className="grid grid-cols-3 gap-2">
                {ENGLISH_LEVEL_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLevel(id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      level === id
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {t.levels[id]}
                  </button>
                ))}
              </div>
            </div>

            {/* topic 상담: 학습 목표 */}
            {topic && (
              <div>
                <label htmlFor="consult-goal" className="font-bold text-slate-700 block mb-1">{topic.goalLabel}</label>
                <textarea
                  id="consult-goal"
                  rows={2}
                  maxLength={TOPIC_GOAL_MAX}
                  placeholder={topic.goalPlaceholder}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
                />
              </div>
            )}

            {/* 문의사항 */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">{t.messageLabel}</label>
              <textarea
                rows={3}
                placeholder={topic ? topic.messagePlaceholder : t.messagePlaceholder}
                value={message}
                maxLength={topic ? TOPIC_MESSAGE_MAX : undefined}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
              />
            </div>

            {submitError && (
              <p role="alert" className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700">
                {submitError}
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-[11px] text-slate-400">{t.privacyNote}</span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancelButton}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{t.submitButton}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
