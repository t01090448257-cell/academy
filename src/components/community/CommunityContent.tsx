"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/config/i18n";
import ConsultSidebarCard from "@/components/common/ConsultSidebarCard";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";

interface CommunityContentProps {
  lang: Locale;
}

type SectionId = "notices" | "reviews" | "gallery" | "qna" | "faq";

function t2<T>(lang: Locale, ko: T, en: T): T {
  return lang === "ko" ? ko : en;
}

/* ------------------------------------------------------------------ */
/* 아이콘                                                              */
/* ------------------------------------------------------------------ */
function IconPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconHelp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l11-11-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 정적 게시글 데이터 (⚠️ 지금은 화면 레이아웃용 더미 데이터입니다.               */
/* 추후 DB 연동 시 이 배열을 API 호출 결과로 교체하면 됩니다.)                     */
/* ------------------------------------------------------------------ */
interface BoardRow {
  id: string;
  pinned?: boolean;
  hasPhoto?: boolean;
  rating?: number;
  answerCount?: number;
  titleKo: string;
  titleEn: string;
  contentKo: string;
  contentEn: string;
  replyKo?: string;
  replyEn?: string;
  author: string;
  date: string;
  views: number;
  likes: number;
}

/* ------------------------------------------------------------------ */
/* 댓글 데이터 (⚠️ 지금은 로컬 state(데모)로만 동작합니다.                        */
/* 추후 DB 연동 시: initial 시드 제거 → 게시글 클릭 시 GET /posts/:id/comments   */
/* 로 교체, addComment 내부를 POST 요청으로 교체하면 나머지 로직은 그대로 재사용됩니다.) */
/* ------------------------------------------------------------------ */
interface CommentItem {
  id: string;
  postId: string;
  parentId: string | null; // null이면 최상위 댓글, 값이 있으면 해당 댓글의 답글
  author: string;
  content: string;
  date: string;
}

const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: "c1",
    postId: "q1",
    parentId: null,
    author: "익명",
    content: "저도 같은 부분이 궁금했어요! 답변 감사합니다.",
    date: "2026-09-10",
  },
  {
    id: "c2",
    postId: "q1",
    parentId: "c1",
    author: "SYA 운영팀",
    content: "네 도움이 되었다니 다행이에요 :) 추가로 궁금하신 점 있으면 언제든 남겨주세요.",
    date: "2026-09-10",
  },
  {
    id: "c3",
    postId: "r1",
    parentId: null,
    author: "예비 유학생맘",
    content: "생생한 후기 감사합니다! 식단이나 액티비티도 이 정도면 정말 알차네요.",
    date: "2026-09-05",
  },
];

interface SectionConfig {
  id: SectionId;
  icon: React.ReactNode;
  sidebarTitleKo: string;
  sidebarTitleEn: string;
  captionEn: string;
  headingKo: string;
  headingEn: string;
  subtitleKo: string;
  subtitleEn: string;
  boardLabelKo: string;
  boardLabelEn: string;
  badgeKo: string;
  badgeEn: string;
  badgeClassName: string;
  rows: BoardRow[];
}

const SECTIONS: SectionConfig[] = [
  {
    id: "notices",
    icon: <IconPin />,
    sidebarTitleKo: "학원 공지사항",
    sidebarTitleEn: "Notices",
    captionEn: "Notices",
    headingKo: "학원 공지사항",
    headingEn: "Notices",
    subtitleKo: "SYA 주요 소식 및 학사 일정",
    subtitleEn: "Key SYA news and academic schedule updates",
    boardLabelKo: "공지사항",
    boardLabelEn: "Notices",
    badgeKo: "공지",
    badgeEn: "Notice",
    badgeClassName: "bg-red-500 text-white",
    rows: [
      {
        id: "n1",
        pinned: true,
        titleKo: "[공지] 2025-2026 SYA 필리핀 세부 어학원 코스별 조기등록 프로모션 안내 (선착순 학비 20% 지원)",
        titleEn: "[Notice] 2025-2026 SYA Cebu Early-Bird Enrollment Promotion (20% Off, First-Come Basis)",
        contentKo: "2025-2026학년도 SYA 필리핀 세부 어학원 전 과정 조기등록 프로모션을 안내드립니다. 8주 이상 등록 시 학비의 최대 20%를 선착순으로 지원해드리며, 상세 조건은 학사처로 문의 바랍니다. 많은 관심과 참여 부탁드립니다.",
        contentEn: "We're pleased to announce the 2025-2026 SYA Cebu early-bird enrollment promotion. Students enrolling for 8 weeks or more can receive up to 20% off tuition on a first-come, first-served basis. Please contact the academic office for full details.",
        author: "SYA 학사처",
        date: "2026-09-08",
        views: 1420,
        likes: 45,
      },
      {
        id: "n2",
        pinned: true,
        titleKo: "[필독] 필리핀 입국 시 e-Travel(전자입국신고서) 등록 규정 및 안내 가이드",
        titleEn: "[Must Read] Philippines e-Travel Registration Guide for Arrivals",
        contentKo: "필리핀 입국 시 전자입국신고서(e-Travel) 등록이 의무화되었습니다. 출국 최소 72시간 전부터 공식 e-Travel 웹사이트에서 등록 가능하며, 등록 완료 후 발급되는 QR코드를 입국 심사 시 제시해야 합니다. 자세한 등록 절차는 학사처에서 별도 안내드립니다.",
        contentEn: "Registering an e-Travel form is now mandatory for all arrivals to the Philippines. You can register on the official e-Travel website starting 72 hours before departure, and you'll need to present the QR code issued upon completion at immigration. The academic office will send detailed registration instructions separately.",
        author: "SYA 운영팀",
        date: "2026-09-02",
        views: 980,
        likes: 31,
      },
    ],
  },
  {
    id: "reviews",
    icon: <IconStar />,
    sidebarTitleKo: "생생 연수후기",
    sidebarTitleEn: "Student Reviews",
    captionEn: "Student Reviews",
    headingKo: "생생 연수후기",
    headingEn: "Student Reviews",
    subtitleKo: "졸업생들의 진솔한 어학연수 체험기",
    subtitleEn: "Honest experiences from SYA graduates",
    boardLabelKo: "연수후기",
    boardLabelEn: "Reviews",
    badgeKo: "연수후기",
    badgeEn: "Review",
    badgeClassName: "bg-emerald-50 text-emerald-700",
    rows: [
      {
        id: "r1",
        hasPhoto: true,
        rating: 5.0,
        titleKo: "[연수후기] 영어포비아였던 제가 12주 만에 외국계 마케팅팀 영어면접 합격했습니다! (ESL + 비즈니스 코스)",
        titleEn: "[Review] I went from English-phobic to passing a marketing interview at a global firm in 12 weeks! (ESL + Business)",
        contentKo: "영어울렁증이 심해서 첫 상담 때도 벌벌 떨었던 제가, 12주 ESL+비즈니스 코스를 마치고 외국계 기업 마케팅팀 면접에 영어로 합격했습니다. 매일 아침 선생님과 눈 맞추고 대화하는 게 처음엔 정말 힘들었는데, 6주쯤 지나니 제 입에서 문장이 먼저 나오는 걸 느꼈어요. SYA 선생님들과 매니저님들께 정말 감사드립니다.",
        contentEn: "I was so nervous about English that I trembled during my first consultation. After 12 weeks of ESL + Business courses, I passed an English interview for a marketing team at a global company. Making eye contact and talking with my teacher every morning was really hard at first, but around week 6 I noticed full sentences coming out on their own. Huge thanks to all the SYA teachers and staff.",
        author: "김민주 (Min)",
        date: "2026-09-05",
        views: 830,
        likes: 64,
      },
    ],
  },
  {
    id: "gallery",
    icon: <IconEye />,
    sidebarTitleKo: "학원 갤러리 (현장스케치)",
    sidebarTitleEn: "Campus Gallery",
    captionEn: "Campus Gallery",
    headingKo: "학원 갤러리 (현장스케치)",
    headingEn: "Campus Gallery",
    subtitleKo: "캠퍼스 및 주말 액티비티 사진",
    subtitleEn: "Photos from campus life and weekend activities",
    boardLabelKo: "학원갤러리",
    boardLabelEn: "Gallery",
    badgeKo: "학원갤러리",
    badgeEn: "Gallery",
    badgeClassName: "bg-blue-50 text-blue-700",
    rows: [
      {
        id: "g1",
        hasPhoto: true,
        titleKo: "[SYA 현장스케치] 활기찬 주말 세부 아일랜드 호핑투어 & 바비큐 파티 현장",
        titleEn: "[SYA Snapshot] A lively weekend Cebu island-hopping tour & BBQ party",
        contentKo: "지난 주말, SYA 학생들과 함께 세부 근교 아일랜드 호핑투어를 다녀왔습니다! 맑은 에메랄드빛 바다에서 스노클링을 즐기고, 갓 잡은 해산물로 즉석 바비큐 파티까지 — 수업만큼이나 잊지 못할 주말이었어요. 다음 주말 액티비티도 기대해주세요!",
        contentEn: "Last weekend, SYA students headed out on an island-hopping tour near Cebu! We snorkeled in crystal-clear emerald waters and capped it off with a fresh seafood BBQ party right on the beach — a weekend just as memorable as our classes. Stay tuned for next weekend's activity!",
        author: "SYA 액티비티팀",
        date: "2026-09-07",
        views: 520,
        likes: 41,
      },
      {
        id: "g2",
        hasPhoto: true,
        titleKo: "[캠퍼스 엿보기] 2026 최신 리노베이션 기숙사 & 야외 수영장 카페 라운지",
        titleEn: "[Campus Peek] Newly renovated 2026 dorms & the outdoor pool cafe lounge",
        contentKo: "2026년 새단장을 마친 SYA 기숙사와 야외 수영장 카페 라운지를 소개합니다! 한층 넓어진 객실과 편안한 라운지 공간에서 수업 후 여유로운 시간을 보내실 수 있어요. 직접 캠퍼스에 방문하시면 더 생생하게 확인하실 수 있습니다.",
        contentEn: "Introducing SYA's newly renovated 2026 dormitories and outdoor pool cafe lounge! Enjoy more spacious rooms and a relaxing lounge space to unwind after class. Visit our campus in person for the full experience.",
        author: "SYA 운영팀",
        date: "2026-08-30",
        views: 610,
        likes: 38,
      },
    ],
  },
  {
    id: "qna",
    icon: <IconChat />,
    sidebarTitleKo: "질문과 답변 (Q&A)",
    sidebarTitleEn: "Q&A Board",
    captionEn: "Q&A Board",
    headingKo: "질문과 답변 (Q&A)",
    headingEn: "Q&A Board",
    subtitleKo: "연수 전 궁금증을 신속히 해결",
    subtitleEn: "Get your pre-departure questions answered quickly",
    boardLabelKo: "Q&A질문",
    boardLabelEn: "Q&A",
    badgeKo: "Q&A질문",
    badgeEn: "Q&A",
    badgeClassName: "bg-sky-50 text-sky-700",
    rows: [
      {
        id: "q1",
        answerCount: 1,
        titleKo: "영어가 완전 기초인데 1:1 수업 따라가는 데 무리가 없을까요?",
        titleEn: "I'm a complete beginner — will I be able to keep up with 1:1 classes?",
        contentKo: "안녕하세요! 저는 영어 기초가 거의 없는 왕초보인데, 1:1 수업을 따라갈 수 있을지 걱정이 많습니다. 레벨테스트는 어떻게 진행되고, 저 같은 초급자를 위한 커리큘럼이 따로 있는지 궁금합니다.",
        contentEn: "Hi! I'm a complete beginner with almost no English foundation, and I'm worried about keeping up with 1:1 classes. How does the level test work, and is there a curriculum designed specifically for beginners like me?",
        replyKo: "안녕하세요, SYA 학사처입니다. 입학 첫날 진행되는 레벨테스트 결과에 따라 왕초보 전용 커리큘럼(기초 파닉스·생활영어 중심)으로 배정되니 전혀 걱정하지 않으셔도 됩니다. 선생님이 학생 눈높이에 완전히 맞춰 진행하니 편안하게 시작하세요!",
        replyEn: "Hello, this is the SYA academic office. Based on your Day 1 level test, you'll be placed in our beginner-focused curriculum (centered on basic phonics and everyday English), so there's no need to worry at all. Your teacher will fully match your pace — please start with confidence!",
        author: "예비연수생 최*우",
        date: "2026-09-09",
        views: 310,
        likes: 12,
      },
    ],
  },
  {
    id: "faq",
    icon: <IconHelp />,
    sidebarTitleKo: "자주 묻는 질문 (FAQ)",
    sidebarTitleEn: "FAQ",
    captionEn: "FAQ",
    headingKo: "자주 묻는 질문 (FAQ)",
    headingEn: "FAQ",
    subtitleKo: "자주 묻는 질문 베스트 총정리",
    subtitleEn: "The most commonly asked questions, all in one place",
    boardLabelKo: "자주하는질문",
    boardLabelEn: "FAQ",
    badgeKo: "자주하는질문",
    badgeEn: "FAQ",
    badgeClassName: "bg-amber-50 text-amber-700",
    rows: [
      {
        id: "f1",
        titleKo: "연수 중 세탁과 룸클리닝, 식사는 어떻게 제공되나요?",
        titleEn: "How are laundry, room cleaning, and meals handled during the program?",
        contentKo: "노블 호텔 세부 기숙사 투숙 학생 전원에게 주 3회 무료 세탁 서비스와 정기 룸클리닝이 기본 제공됩니다. 식사는 1일 3식 호텔 뷔페(한식 위주 + 다국적 데이) 형태로 제공되며 별도 추가 비용은 없습니다.",
        contentEn: "All students staying at The Noble Cebu dormitory receive free laundry service 3 times a week and regular room cleaning as standard. Meals are provided as a 3-meals-a-day hotel buffet (mainly Korean cuisine plus international theme days) at no additional cost.",
        author: "SYA 생활지원팀",
        date: "2026-09-01",
        views: 450,
        likes: 19,
      },
    ],
  },
];

export default function CommunityContent({ lang }: CommunityContentProps) {
  const ko = lang === "ko";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openConsultation } = useConsultationModal();
  const [activeSection, setActiveSection] = useState<SectionId>("notices");
  const [query, setQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<BoardRow | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);
  const [commentNickname, setCommentNickname] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);

  // 모달을 닫거나 다른 글을 열면 작성 중이던 댓글 입력값을 초기화한다.
  useEffect(() => {
    setCommentDraft("");
    setReplyToId(null);
  }, [selectedPost]);

  // 헤더 드롭다운 등에서 ?tab=faq 같은 쿼리로 들어오면 해당 게시판을 바로 열어준다.
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && SECTIONS.some((s) => s.id === tabParam)) {
      setActiveSection(tabParam as SectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("tab")]);

  const section = SECTIONS.find((s) => s.id === activeSection)!;

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return section.rows;
    return section.rows.filter((row) => {
      const title = (ko ? row.titleKo : row.titleEn).toLowerCase();
      return title.includes(q) || row.author.toLowerCase().includes(q);
    });
  }, [section, query, ko]);

  function goToCalculator() {
    router.push(`/${lang}/services?tab=calculator`);
  }

  // ⚠️ TODO: DB 연동 시 이 함수 내부를 POST /api/posts/:postId/comments 호출로 교체.
  // 호출부(폼 onSubmit)는 그대로 두고 이 함수만 async로 바꾸면 나머지 UI 로직은 수정할 필요가 없습니다.
  function addComment(postId: string, content: string, parentId: string | null) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      postId,
      parentId,
      author: commentNickname.trim() || t2(lang, "익명", "Guest"),
      content: trimmed,
      date: new Date().toISOString().slice(0, 10),
    };
    setComments((prev) => [...prev, newComment]);
    setCommentDraft("");
    setReplyToId(null);
  }

  function handleWriteClick() {
    // ⚠️ TODO: 실제 게시판 글쓰기 기능은 Phase 12(DB 연동) 이후 폼/에디터로 교체하세요.
    window.alert(
      t2(lang, "게시판 글쓰기 기능은 준비 중입니다. 곧 만나요!", "The posting feature is coming soon!")
    );
  }

  return (
    <main className="bg-sya-soft">
      {/* 상단 배너 (다른 메뉴들과 동일한 패턴) */}
      <section className="bg-gradient-to-br from-sya-navy via-sya-navy to-sya-navy px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sya-gold/20 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sya-gold">
              <span aria-hidden="true">🎓</span>
              Community &amp; Board
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              {t2(lang, "커뮤니티", "Community")}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/60 sm:text-base">
              {t2(
                lang,
                "공지사항, 생생한 연수후기, 학원 소식과 질문답변 공간",
                "Notices, real student reviews, academy news, and a space for Q&A"
              )}
            </p>
          </div>
          <p className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/50 sm:text-xs">
            HOME <span className="mx-1">›</span> {t2(lang, "커뮤니티", "Community")}
            <span className="mx-1">›</span>
            <span className="font-bold text-sya-gold">{ko ? section.boardLabelKo : section.boardLabelEn}</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
          {/* 좌측 사이드바 */}
          <nav aria-label="Community sub navigation" className="lg:sticky lg:top-24">
            <ul className="space-y-2">
              {SECTIONS.map(({ id, icon, sidebarTitleKo, sidebarTitleEn, captionEn }) => {
                const active = activeSection === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection(id);
                        setQuery("");
                      }}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-transparent bg-gradient-to-r from-sya-navy to-sya-ink text-white shadow-lg shadow-sya-navy/20"
                          : "border-sya-ink/8 bg-white text-sya-ink hover:border-sya-navy/25 hover:shadow-sm"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/15 text-white" : "bg-sya-navy/[0.06] text-sya-navy"}`}>
                        {icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-bold leading-snug ${active ? "text-white" : "text-sya-ink"}`}>
                          {ko ? sidebarTitleKo : sidebarTitleEn}
                        </span>
                        <span className={`block truncate text-[10px] font-medium ${active ? "text-white/70" : "text-sya-ink/45"}`}>
                          {captionEn}
                        </span>
                      </span>
                      <span className={active ? "text-white/70" : "text-sya-ink/25"}>
                        <IconChevron />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <ConsultSidebarCard lang={lang} />
          </nav>

          {/* 우측 콘텐츠 */}
          <div>
            {/* 브레드크럼 + 타이틀 + 상단 버튼 */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-sya-ink/45">
                  {t2(lang, "커뮤니티", "Community")} <span className="mx-1">›</span>
                  <span className="font-semibold text-sya-navy">{section.captionEn.toUpperCase()}</span>
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-sya-navy sm:text-3xl">
                  {ko ? section.headingKo : section.headingEn}
                </h2>
                <p className="mt-1 text-sm text-sya-ink/55">{ko ? section.subtitleKo : section.subtitleEn}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openConsultation()}
                  className="flex items-center gap-1.5 rounded-full border border-sya-navy/15 bg-white px-4 py-2 text-xs font-semibold text-sya-navy transition-colors hover:bg-sya-navy/5"
                >
                  <IconChat /> {t2(lang, "상담 문의", "Consult")}
                </button>
                <button
                  type="button"
                  onClick={goToCalculator}
                  className="rounded-full border border-sya-gold/40 bg-sya-gold/10 px-4 py-2 text-xs font-semibold text-sya-gold-deep transition-colors hover:bg-sya-gold/20"
                >
                  📊 {t2(lang, "견적 계산", "Get a Quote")}
                </button>
              </div>
            </div>

            {/* 게시판 카드 */}
            <div className="mt-6 rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-sya-navy">
                  {ko ? section.boardLabelKo : section.boardLabelEn}{" "}
                  <span className="font-medium text-sya-ink/40">
                    {t2(lang, `총 ${section.rows.length}건`, `${section.rows.length} total`)}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sya-ink/30">
                      <IconSearch />
                    </span>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t2(lang, "제목, 작성자, 내용 검색", "Search title, author, content")}
                      className="w-56 rounded-full border border-sya-ink/12 bg-sya-soft py-2 pl-9 pr-3 text-xs text-sya-ink outline-none transition-colors focus:border-sya-navy/40 sm:w-64"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleWriteClick}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-sya-navy px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-sya-ink"
                  >
                    <IconEdit /> {t2(lang, "글쓰기 / 질문", "Write / Ask")}
                  </button>
                </div>
              </div>

              {/* 목록 테이블 */}
              <div className="mt-5 overflow-x-auto rounded-xl border border-sya-ink/8">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-sya-ink/10 bg-sya-soft text-sya-ink">
                      <th className="whitespace-nowrap px-3 py-3 text-[13px] font-bold">{t2(lang, "구분", "Type")}</th>
                      <th className="px-4 py-3 text-[13px] font-bold">{t2(lang, "제목", "Title")}</th>
                      <th className="w-20 px-2 py-3 text-[13px] font-bold">{t2(lang, "작성자", "Author")}</th>
                      <th className="w-16 px-2 py-3 text-[13px] font-bold">{t2(lang, "등록일", "Date")}</th>
                      <th className="w-12 px-2 py-3 text-right text-[13px] font-bold">{t2(lang, "조회", "Views")}</th>
                      <th className="w-12 px-2 py-3 text-right text-[13px] font-bold">{t2(lang, "추천", "Likes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-sya-ink/40">
                          {t2(lang, "검색 결과가 없습니다.", "No results found.")}
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, i) => (
                        <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-sya-soft"}>
                          <td className="px-3 py-3 align-top">
                            {row.pinned ? (
                              <span className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-red-500 text-center text-[10px] font-bold leading-tight text-white">
                                <span aria-hidden="true">📌</span>
                                {ko ? section.badgeKo : section.badgeEn}
                              </span>
                            ) : (
                              <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold ${section.badgeClassName}`}>
                                {ko ? section.badgeKo : section.badgeEn}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => setSelectedPost(row)}
                              className="text-left font-semibold text-sya-ink hover:text-sya-navy hover:underline"
                            >
                              {ko ? row.titleKo : row.titleEn}
                            </button>
                            {typeof row.answerCount === "number" && (
                              <span className="ml-1.5 text-xs font-bold text-blue-600">[{row.answerCount}]</span>
                            )}
                            <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
                              {row.hasPhoto && (
                                <span className="rounded border border-sya-ink/10 px-1.5 py-0.5 text-[10px] text-sya-ink/45">
                                  {t2(lang, "사진", "Photo")}
                                </span>
                              )}
                              {typeof row.rating === "number" && (
                                <span className="text-[11px] font-bold text-amber-500">★ {row.rating.toFixed(1)}</span>
                              )}
                            </span>
                          </td>
                          <td className="px-2 py-3 align-top text-xs text-sya-ink/70">{row.author}</td>
                          <td className="px-2 py-3 align-top text-xs text-sya-ink/50">{row.date}</td>
                          <td className="px-2 py-3 align-top text-right text-xs text-sya-ink/50">{row.views.toLocaleString()}</td>
                          <td className="px-2 py-3 align-top text-right text-xs text-sya-ink/50">{row.likes.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 게시글 상세 모달 (DB 연동 전 — 지금은 더미 데이터를 그대로 보여줍니다) */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-sya-navy/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sya-ink/10 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-4 border-b border-sya-ink/8 bg-sya-soft p-5 sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold ${section.badgeClassName}`}>
                    {ko ? section.badgeKo : section.badgeEn}
                  </span>
                  {typeof selectedPost.rating === "number" && (
                    <span className="text-xs font-bold text-amber-500">★ {selectedPost.rating.toFixed(1)}</span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-black leading-snug text-sya-navy sm:text-lg">
                  {ko ? selectedPost.titleKo : selectedPost.titleEn}
                </h3>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sya-ink/50">
                  <span>{t2(lang, "작성자", "Author")}: <strong className="text-sya-ink/70">{selectedPost.author}</strong></span>
                  <span>{t2(lang, "작성일", "Date")}: {selectedPost.date}</span>
                  <span>{t2(lang, "조회", "Views")}: {selectedPost.views.toLocaleString()}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                aria-label={t2(lang, "닫기", "Close")}
                className="shrink-0 rounded-lg p-1.5 text-sya-ink/40 transition-colors hover:bg-sya-ink/5 hover:text-sya-ink"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-sya-ink/80">
                {ko ? selectedPost.contentKo : selectedPost.contentEn}
              </p>

              {(selectedPost.replyKo || selectedPost.replyEn) && (
                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-sky-700">
                    <span className="rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {t2(lang, "학원 공식 답변", "Official Reply")}
                    </span>
                    SYA
                  </p>
                  <p className="text-xs leading-relaxed text-sya-ink/75">
                    {ko ? selectedPost.replyKo : selectedPost.replyEn}
                  </p>
                </div>
              )}

              {/* 추천 버튼 (로컬 표시용 — 새로고침 시 초기화됩니다) */}
              <div className="flex justify-center border-t border-sya-ink/8 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setLikedPostIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(selectedPost.id)) next.delete(selectedPost.id);
                      else next.add(selectedPost.id);
                      return next;
                    })
                  }
                  className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-bold transition-colors ${
                    likedPostIds.has(selectedPost.id)
                      ? "border-rose-300 bg-rose-50 text-rose-600"
                      : "border-sya-ink/15 bg-white text-sya-ink/70 hover:bg-sya-ink/5"
                  }`}
                >
                  <span aria-hidden="true">{likedPostIds.has(selectedPost.id) ? "♥" : "♡"}</span>
                  {t2(lang, "추천", "Like")} ({selectedPost.likes + (likedPostIds.has(selectedPost.id) ? 1 : 0)})
                </button>
              </div>

              {/* 댓글 영역 (⚠️ 데모용 로컬 state — 새로고침 시 초기화됩니다) */}
              {(() => {
                const postComments = comments.filter((c) => c.postId === selectedPost.id);
                const topLevel = postComments.filter((c) => c.parentId === null);
                const repliesOf = (parentId: string) => postComments.filter((c) => c.parentId === parentId);

                return (
                  <div className="border-t border-sya-ink/8 pt-5">
                    <p className="text-sm font-bold text-sya-navy">
                      {t2(lang, "댓글", "Comments")} <span className="font-medium text-sya-ink/40">({postComments.length})</span>
                    </p>

                    <div className="mt-3 space-y-4">
                      {topLevel.length === 0 && (
                        <p className="text-xs text-sya-ink/40">
                          {t2(lang, "가장 먼저 댓글을 남겨보세요.", "Be the first to leave a comment.")}
                        </p>
                      )}
                      {topLevel.map((c) => (
                        <div key={c.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-xs font-bold text-sya-ink">{c.author}</span>
                                <span className="text-[10px] text-sya-ink/35">{c.date}</span>
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-sya-ink/75">{c.content}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyToId(replyToId === c.id ? null : c.id)}
                              className="shrink-0 text-[11px] font-semibold text-sya-navy/60 hover:text-sya-navy hover:underline"
                            >
                              {t2(lang, "답글", "Reply")}
                            </button>
                          </div>

                          {/* 답글 목록 */}
                          {repliesOf(c.id).length > 0 && (
                            <div className="mt-3 ml-4 space-y-3 border-l-2 border-sya-ink/8 pl-4">
                              {repliesOf(c.id).map((r) => (
                                <div key={r.id}>
                                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span className="text-xs font-bold text-sya-ink">{r.author}</span>
                                    <span className="text-[10px] text-sya-ink/35">{r.date}</span>
                                  </p>
                                  <p className="mt-1 text-sm leading-relaxed text-sya-ink/75">{r.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 답글 입력창 (해당 댓글의 '답글' 클릭 시에만 표시) */}
                          {replyToId === c.id && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                addComment(selectedPost.id, commentDraft, c.id);
                              }}
                              className="mt-3 ml-4 flex flex-col gap-2 border-l-2 border-sya-ink/8 pl-4"
                            >
                              <textarea
                                value={commentDraft}
                                onChange={(e) => setCommentDraft(e.target.value)}
                                placeholder={t2(lang, `${c.author}님에게 답글 남기기`, `Reply to ${c.author}`)}
                                rows={2}
                                autoFocus
                                className="w-full resize-none rounded-lg border border-sya-ink/12 bg-sya-soft p-2.5 text-xs text-sya-ink outline-none focus:border-sya-navy/40"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReplyToId(null)}
                                  className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-sya-ink/50 hover:bg-sya-ink/5"
                                >
                                  {t2(lang, "취소", "Cancel")}
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-full bg-sya-navy px-4 py-1.5 text-[11px] font-bold text-white hover:bg-sya-ink"
                                >
                                  {t2(lang, "등록", "Post")}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 새 댓글 작성 폼 */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        addComment(selectedPost.id, commentDraft, null);
                      }}
                      className="mt-5 space-y-2 rounded-xl bg-sya-navy/[0.03] p-3.5"
                    >
                      <input
                        type="text"
                        value={commentNickname}
                        onChange={(e) => setCommentNickname(e.target.value)}
                        placeholder={t2(lang, "닉네임 (선택, 미입력 시 '익명')", "Nickname (optional, defaults to 'Guest')")}
                        className="w-full rounded-lg border border-sya-ink/12 bg-white px-3 py-2 text-xs text-sya-ink outline-none focus:border-sya-navy/40"
                      />
                      <textarea
                        value={replyToId ? "" : commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        disabled={!!replyToId}
                        placeholder={
                          replyToId
                            ? t2(lang, "위 답글 입력창을 먼저 완료해 주세요", "Finish the reply above first")
                            : t2(lang, "댓글을 입력해 주세요", "Write a comment")
                        }
                        rows={3}
                        className="w-full resize-none rounded-lg border border-sya-ink/12 bg-white p-3 text-sm text-sya-ink outline-none focus:border-sya-navy/40 disabled:bg-sya-ink/[0.03] disabled:text-sya-ink/30"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!!replyToId}
                          className="rounded-full bg-sya-navy px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-sya-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t2(lang, "댓글 등록", "Post Comment")}
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
