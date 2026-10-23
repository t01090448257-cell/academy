"use client";

// /admin/consultations 상담 목록
// 데이터 흐름: PostgreSQL → Prisma → GET /api/consultations?q=&status=&counterpart=&type=&source=&assigned= → 이 화면
// [Stage 5-B-1] 접수 경로(source: homepage | admin=관리자 등록) · 담당자(assigned: unassigned | 관리자 id) 필터 추가
// [Stage 5-B-2] 다음 상담일(followup: today | tomorrow | week | overdue | unspecified) 필터 추가
// 검색어·필터는 주소에 남겨 새로고침·뒤로가기에도 유지됩니다.
// 학생 목록(StudentList)과 같은 방식: 같은 조건으로 다시 검색해도 재조회(reloadKey), 15초 응답 제한

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { formatDate, formatDateKst, show } from "@/components/admin/students/format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABELS,
  COUNTERPART_LABELS,
  COUNTERPART_TYPES,
} from "@/lib/consultationValidation";
import {
  ConsultationStatusBadge,
  CounterpartText,
  consultedDateText,
  hasIntakeInfo,
  isHomepageConsultation,
  preferredStartDateText,
  programText,
  sourceLabel,
  weeksText,
  type ConsultationRecord,
} from "./ConsultationBadges";

/** 상담 목록 조회 제한 시간 (응답이 없으면 무한 로딩 대신 오류 표시) */
const LIST_TIMEOUT_MS = 15_000;
const LIST_TIMEOUT_MESSAGE = "상담 목록을 불러오는 데 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.";

/** [Stage 5-B-1] 담당자 필터 선택지 (GET /api/consultations 응답의 adminOptions) */
interface AdminFilterOption {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
}

interface ListState {
  loading: boolean;
  sessionExpired?: boolean;
  error: string;
  consultations: ConsultationRecord[];
  typeOptions: string[];
  adminOptions: AdminFilterOption[];
}

interface Filters {
  q: string;
  status: string;
  counterpart: string;
  type: string;
  source: string;
  assigned: string;
  followup: string;
}

/** [Stage 5-B-2] 다음 상담일 필터 (한국 날짜 기준 계산은 API에서) */
const FOLLOWUP_FILTERS = [
  { value: "today", label: "오늘" },
  { value: "tomorrow", label: "내일" },
  { value: "week", label: "이번 주" },
  { value: "overdue", label: "예정일 지남" },
  { value: "unspecified", label: "미지정" },
] as const;

/** [Stage 5-B-1] 접수 경로 필터 (관리자 등록 = DB source가 NULL인 상담) */
const SOURCE_FILTERS = [
  { value: "homepage", label: "홈페이지" },
  { value: "admin", label: "관리자 등록" },
] as const;

/** 상담 내용 한 줄 요약 */
function summary(value: string | null, max = 60): string {
  if (!value) return "-";
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/** 접수 경로: 홈페이지 상담은 배지, 그 외(관리자 등록 등)는 글자 */
function SourceText({ record }: { record: ConsultationRecord }) {
  if (isHomepageConsultation(record)) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
        {sourceLabel(record.source)}
      </span>
    );
  }
  return <span className="whitespace-nowrap text-slate-500">{sourceLabel(record.source)}</span>;
}

/** 상담 대상: 홈페이지 상담은 "홈페이지 신청", 그 외는 기존 표시 그대로 */
function CounterpartCell({ record }: { record: ConsultationRecord }) {
  return isHomepageConsultation(record) ? <span>홈페이지 신청</span> : <CounterpartText record={record} />;
}

export default function ConsultationList({ justDeleted = false }: { justDeleted?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const counterpart = searchParams.get("counterpart") ?? "all";
  const type = searchParams.get("type") ?? "all";
  const source = searchParams.get("source") ?? "all";
  const assigned = searchParams.get("assigned") ?? "all";
  // [Stage 5-B-2] 알 수 없는 값(주소 직접 입력)은 "전체"로 취급 — API도 허용값 외에는 조건을 두지 않음
  const followupParam = searchParams.get("followup") ?? "all";
  const followup = FOLLOWUP_FILTERS.some((option) => option.value === followupParam) ? followupParam : "all";

  const [keyword, setKeyword] = useState(q);
  const [state, setState] = useState<ListState>({
    loading: true,
    error: "",
    consultations: [],
    typeOptions: [],
    adminOptions: [],
  });
  // 주소가 그대로인 채로 「검색」을 다시 누른 경우에도 재조회하기 위한 값
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, LIST_TIMEOUT_MS);

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (counterpart !== "all") params.set("counterpart", counterpart);
    if (type !== "all") params.set("type", type);
    if (source !== "all") params.set("source", source);
    if (assigned !== "all") params.set("assigned", assigned);
    if (followup !== "all") params.set("followup", followup);
    const query = params.toString();

    // 실제 요청을 시작하는 시점에만 loading을 켭니다.
    setState((prev) => ({ ...prev, loading: true, error: "", sessionExpired: false }));

    fetch(`/api/consultations${query ? `?${query}` : ""}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setState((prev) => ({ ...prev, loading: false, error: "", sessionExpired: true }));
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.success) {
          setState((prev) => ({ ...prev, loading: false, error: data?.message || "상담 목록을 불러오지 못했습니다." }));
          return;
        }
        setState({
          loading: false,
          error: "",
          consultations: data.consultations ?? [],
          typeOptions: data.typeOptions ?? [],
          adminOptions: data.adminOptions ?? [],
        });
      })
      .catch((error) => {
        if (cancelled) return;
        if (timedOut) {
          setState((prev) => ({ ...prev, loading: false, error: LIST_TIMEOUT_MESSAGE }));
          return;
        }
        console.error("상담 목록 조회 오류:", error);
        setState((prev) => ({ ...prev, loading: false, error: "상담 목록을 불러오는 중 오류가 발생했습니다." }));
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, status, counterpart, type, source, assigned, followup, reloadKey]);

  function updateQuery(next: Partial<Filters>) {
    const target: Filters = {
      q: (next.q ?? q).trim(),
      status: next.status || status || "all",
      counterpart: next.counterpart || counterpart || "all",
      type: next.type || type || "all",
      source: next.source || source || "all",
      assigned: next.assigned || assigned || "all",
      followup: next.followup || followup || "all",
    };

    // 결과적으로 현재 주소와 같은 조건이면 주소 이동 없이 바로 재조회
    if (
      target.q === q &&
      target.status === status &&
      target.counterpart === counterpart &&
      target.type === type &&
      target.source === source &&
      target.assigned === assigned &&
      target.followup === followup
    ) {
      setReloadKey((key) => key + 1);
      return;
    }

    const params = new URLSearchParams();
    if (target.q) params.set("q", target.q);
    if (target.status !== "all") params.set("status", target.status);
    if (target.counterpart !== "all") params.set("counterpart", target.counterpart);
    if (target.type !== "all") params.set("type", target.type);
    if (target.source !== "all") params.set("source", target.source);
    if (target.assigned !== "all") params.set("assigned", target.assigned);
    if (target.followup !== "all") params.set("followup", target.followup);
    const query = params.toString();
    router.push(`/admin/consultations${query ? `?${query}` : ""}`);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ q: keyword });
  }

  function handleReset() {
    setKeyword("");
    updateQuery({ q: "", status: "all", counterpart: "all", type: "all", source: "all", assigned: "all", followup: "all" });
  }

  // 현재 선택된 유형이 목록에 없더라도(예: 주소 직접 입력) 선택지에 표시
  const typeOptions = type !== "all" && !state.typeOptions.includes(type) ? [...state.typeOptions, type] : state.typeOptions;
  // [Stage 5-B-1] 현재 선택된 담당자가 목록에 없더라도(예: 주소 직접 입력) 선택지에 표시
  const assignedMissing =
    assigned !== "all" && assigned !== "unassigned" && !state.adminOptions.some((admin) => admin.id === assigned);
  const filtered =
    Boolean(q) ||
    status !== "all" ||
    counterpart !== "all" ||
    type !== "all" ||
    source !== "all" ||
    assigned !== "all" ||
    followup !== "all";
  const selectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Consultations</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">상담 관리</h1>
        </div>
        <Link
          href="/admin/consultations/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
          상담 등록
        </Link>
      </div>

      {justDeleted && (
        <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
          상담 기록이 삭제되었습니다.
        </div>
      )}

      {/* 검색 · 필터 */}
      <form onSubmit={handleSearch} className="mt-6 rounded-2xl bg-white p-4 shadow sm:p-5">
        {/* [Stage 5-B-2] 필터가 6개로 늘어 검색창은 한 줄 전체, 필터는 lg 3열 · xl 6열, 버튼은 아래 줄 */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:items-end xl:grid-cols-6">
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-6">
            <label htmlFor="consultation-search" className="mb-1.5 block text-sm font-medium text-slate-700">
              검색
            </label>
            <input
              id="consultation-search"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="학생 이름, 학생번호, 전화번호, 상담 내용"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label htmlFor="consultation-status" className="mb-1.5 block text-sm font-medium text-slate-700">
              상태
            </label>
            <select
              id="consultation-status"
              value={status}
              onChange={(event) => updateQuery({ q: keyword, status: event.target.value })}
              className={selectClass}
            >
              <option value="all">전체</option>
              {CONSULTATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {CONSULTATION_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="consultation-counterpart" className="mb-1.5 block text-sm font-medium text-slate-700">
              상담 대상
            </label>
            <select
              id="consultation-counterpart"
              value={counterpart}
              onChange={(event) => updateQuery({ q: keyword, counterpart: event.target.value })}
              className={selectClass}
            >
              <option value="all">전체</option>
              {COUNTERPART_TYPES.map((value) => (
                <option key={value} value={value}>
                  {COUNTERPART_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="consultation-type" className="mb-1.5 block text-sm font-medium text-slate-700">
              상담 유형
            </label>
            <select
              id="consultation-type"
              value={type}
              onChange={(event) => updateQuery({ q: keyword, type: event.target.value })}
              className={selectClass}
            >
              <option value="all">전체</option>
              {typeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {/* [Stage 5-B-1] 접수 경로 */}
          <div>
            <label htmlFor="consultation-source" className="mb-1.5 block text-sm font-medium text-slate-700">
              접수 경로
            </label>
            <select
              id="consultation-source"
              value={source}
              onChange={(event) => updateQuery({ q: keyword, source: event.target.value })}
              className={selectClass}
            >
              <option value="all">전체</option>
              {SOURCE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {/* [Stage 5-B-1] 담당자 */}
          <div>
            <label htmlFor="consultation-assigned" className="mb-1.5 block text-sm font-medium text-slate-700">
              담당자
            </label>
            <select
              id="consultation-assigned"
              value={assigned}
              onChange={(event) => updateQuery({ q: keyword, assigned: event.target.value })}
              className={selectClass}
            >
              <option value="all">전체</option>
              <option value="unassigned">미지정</option>
              {state.adminOptions.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                  {admin.is_active ? "" : " (비활성)"}
                </option>
              ))}
              {assignedMissing && <option value={assigned}>관리자 #{assigned}</option>}
            </select>
          </div>
          {/* [Stage 5-B-2] 다음 상담일 */}
          <div>
            <label htmlFor="consultation-followup" className="mb-1.5 block text-sm font-medium text-slate-700">
              다음 상담일
            </label>
            <select
              id="consultation-followup"
              value={followup}
              onChange={(event) => updateQuery({ q: keyword, followup: event.target.value })}
              className={selectClass}
            >
              <option value="all">전체</option>
              {FOLLOWUP_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 md:col-span-2 lg:col-span-3 xl:col-span-6">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              검색
            </button>
            {filtered && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      </form>

      {/* 결과 */}
      <div className="mt-6 rounded-2xl bg-white shadow">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <p className="text-sm text-slate-500">
            {state.sessionExpired ? (
              "상담 목록"
            ) : state.loading ? (
              "불러오는 중..."
            ) : (
              <>
                총 <strong className="text-slate-900">{state.consultations.length}</strong>건
              </>
            )}
          </p>
        </div>

        {state.sessionExpired ? (
          <div className="m-4 sm:m-5">
            <SessionExpiredNotice />
          </div>
        ) : state.error ? (
          <div className="m-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:m-5">{state.error}</div>
        ) : state.loading ? (
          <div className="space-y-2 p-4 sm:p-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : state.consultations.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-5">
            <p className="text-base font-semibold text-slate-900">
              {filtered ? "검색 결과가 없습니다." : "등록된 상담 기록이 없습니다."}
            </p>
            {filtered && <p className="mt-2 text-sm text-slate-500">검색어나 필터를 바꿔 다시 확인해 주세요.</p>}
          </div>
        ) : (
          <>
            {/* 데스크톱(xl 이상): 표 */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                    <th className="whitespace-nowrap px-4 py-3">상담일</th>
                    <th className="whitespace-nowrap px-4 py-3">접수 경로</th>
                    <th className="px-4 py-3">학생</th>
                    <th className="whitespace-nowrap px-4 py-3">연락처</th>
                    <th className="whitespace-nowrap px-4 py-3">상담 대상</th>
                    <th className="whitespace-nowrap px-4 py-3">상담 유형</th>
                    <th className="whitespace-nowrap px-4 py-3">희망 과정 / 기간</th>
                    <th className="whitespace-nowrap px-4 py-3">희망 시작일</th>
                    <th className="px-4 py-3">상담 내용</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="whitespace-nowrap px-4 py-3">담당자</th>
                    <th className="whitespace-nowrap px-4 py-3">다음 상담일</th>
                    <th className="whitespace-nowrap px-4 py-3">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {state.consultations.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/admin/consultations/${c.id}`)}
                      className="cursor-pointer border-b border-slate-100 align-top transition-colors last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        <Link
                          href={`/admin/consultations/${c.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {consultedDateText(c)}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><SourceText record={c} /></td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap font-semibold text-slate-900">{c.students?.name ?? c.name}</p>
                        <p className="mt-0.5 whitespace-nowrap font-mono text-xs text-slate-500">
                          {c.students ? c.students.student_no ?? "학생번호 미발급" : "학생 미연결"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{show(c.phone)}</td>
                      <td className="px-4 py-3 text-slate-600"><CounterpartCell record={c} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{show(c.inquiry_type)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <p className="whitespace-nowrap">{programText(c)}</p>
                        {typeof c.duration_weeks === "number" && (
                          <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">{weeksText(c.duration_weeks)}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{preferredStartDateText(c)}</td>
                      <td className="max-w-[12rem] px-4 py-3 text-slate-600">
                        <p className="truncate" title={c.message ?? undefined}>{summary(c.message, 40)}</p>
                      </td>
                      <td className="px-4 py-3"><ConsultationStatusBadge value={c.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{show(c.admin_users?.name)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(c.next_consultation_date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateKst(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일·태블릿: 카드 */}
            <ul className="divide-y divide-slate-100 xl:hidden">
              {state.consultations.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/consultations/${c.id}`} className="block px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {c.students?.name ?? c.name}
                          <span className="ml-1.5 font-mono text-xs font-normal text-slate-500">
                            {c.students ? c.students.student_no ?? "학생번호 미발급" : "학생 미연결"}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {consultedDateText(c)} · {show(c.inquiry_type)} · <CounterpartCell record={c} />
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <ConsultationStatusBadge value={c.status} />
                        {isHomepageConsultation(c) && <SourceText record={c} />}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 break-words text-sm text-slate-600">{summary(c.message, 120)}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><dt className="inline text-slate-400">접수 경로 </dt><dd className="inline text-slate-700">{sourceLabel(c.source)}</dd></div>
                      <div><dt className="inline text-slate-400">연락처 </dt><dd className="inline text-slate-700">{show(c.phone)}</dd></div>
                      {hasIntakeInfo(c) && (
                        <>
                          <div><dt className="inline text-slate-400">희망 과정 </dt><dd className="inline text-slate-700">{programText(c)}</dd></div>
                          <div><dt className="inline text-slate-400">희망 기간 </dt><dd className="inline text-slate-700">{weeksText(c.duration_weeks)}</dd></div>
                          <div><dt className="inline text-slate-400">희망 시작일 </dt><dd className="inline text-slate-700">{preferredStartDateText(c)}</dd></div>
                        </>
                      )}
                      <div><dt className="inline text-slate-400">담당자 </dt><dd className="inline text-slate-700">{show(c.admin_users?.name)}</dd></div>
                      <div><dt className="inline text-slate-400">다음 상담일 </dt><dd className="inline text-slate-700">{formatDate(c.next_consultation_date)}</dd></div>
                      <div><dt className="inline text-slate-400">등록일 </dt><dd className="inline text-slate-700">{formatDateKst(c.created_at)}</dd></div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
