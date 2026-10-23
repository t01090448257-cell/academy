"use client";

// /admin/students 학생 목록 (조회 전용)
// 데이터 흐름: PostgreSQL → Prisma → GET /api/students?q=&status= → 이 화면
// 검색어·상태 필터는 주소(?q=&status=)에 남겨 새로고침·뒤로가기에도 유지됩니다.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { formatDate, formatDateKst, show, StatusBadge } from "./format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";

/** 학생 목록 조회 제한 시간 (응답이 없으면 무한 로딩 대신 오류 표시) */
const LIST_TIMEOUT_MS = 15_000;
const LIST_TIMEOUT_MESSAGE = "학생 목록을 불러오는 데 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.";

interface StudentRow {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

interface ListState {
  loading: boolean;
  /** API가 401(로그인 필요)을 돌려준 경우 */
  sessionExpired?: boolean;
  error: string;
  students: StudentRow[];
  statuses: string[];
}

export default function StudentList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  const [keyword, setKeyword] = useState(q);
  const [state, setState] = useState<ListState>({ loading: true, error: "", students: [], statuses: [] });
  // 주소(q·status)가 그대로인 채로 「검색」을 다시 누른 경우에도 재조회하기 위한 값
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
    if (status && status !== "all") params.set("status", status);
    const query = params.toString();

    // 실제 요청을 시작하는 시점에만 loading을 켭니다.
    setState((prev) => ({ ...prev, loading: true, error: "", sessionExpired: false }));

    fetch(`/api/students${query ? `?${query}` : ""}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setState((prev) => ({ ...prev, loading: false, error: "", sessionExpired: true }));
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.success) {
          setState((prev) => ({ ...prev, loading: false, error: data?.message || "학생 목록을 불러오지 못했습니다." }));
          return;
        }
        setState({ loading: false, error: "", students: data.students ?? [], statuses: data.statuses ?? [] });
      })
      .catch((error) => {
        if (cancelled) return; // 조건이 바뀌어 이전 요청을 취소한 경우: 새 요청이 상태를 갱신함
        if (timedOut) {
          setState((prev) => ({ ...prev, loading: false, error: LIST_TIMEOUT_MESSAGE }));
          return;
        }
        console.error("학생 목록 조회 오류:", error);
        setState((prev) => ({ ...prev, loading: false, error: "학생 목록을 불러오는 중 오류가 발생했습니다." }));
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, status, reloadKey]);

  function updateQuery(next: { q?: string; status?: string }) {
    const nextQ = (next.q ?? q).trim();
    const nextStatus = next.status || status || "all";

    // 결과적으로 현재 주소와 같은 조건이면 주소 이동 없이 바로 재조회
    if (nextQ === q && nextStatus === status) {
      setReloadKey((key) => key + 1);
      return;
    }

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextStatus !== "all") params.set("status", nextStatus);
    const query = params.toString();
    router.push(`/admin/students${query ? `?${query}` : ""}`);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ q: keyword });
  }

  function handleReset() {
    setKeyword("");
    updateQuery({ q: "", status: "all" });
  }

  // 현재 선택된 상태가 DB 목록에 없더라도(예: 주소 직접 입력) 선택지에 표시
  const statusOptions = status !== "all" && !state.statuses.includes(status)
    ? [...state.statuses, status]
    : state.statuses;
  const filtered = Boolean(q) || status !== "all";

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Students</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">학생 관리</h1>
        </div>
        <Link
          href="/admin/students/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
          학생 등록
        </Link>
      </div>

      {/* 검색 · 상태 필터 */}
      <form onSubmit={handleSearch} className="mt-6 rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="student-search" className="mb-1.5 block text-sm font-medium text-slate-700">
              검색
            </label>
            <input
              id="student-search"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="이름, 전화번호, 학생번호"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="md:w-48">
            <label htmlFor="student-status" className="mb-1.5 block text-sm font-medium text-slate-700">
              상태
            </label>
            <select
              id="student-status"
              value={status}
              onChange={(event) => updateQuery({ q: keyword, status: event.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">전체</option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
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
            {state.sessionExpired ? "학생 목록" : state.loading ? "불러오는 중..." : <>총 <strong className="text-slate-900">{state.students.length}</strong>명</>}
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
        ) : state.students.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-5">
            <p className="text-base font-semibold text-slate-900">
              {filtered ? "검색 결과가 없습니다." : "등록된 학생이 없습니다."}
            </p>
            {filtered && <p className="mt-2 text-sm text-slate-500">검색어나 상태 필터를 바꿔 다시 확인해 주세요.</p>}
          </div>
        ) : (
          <>
            {/* 데스크톱(lg 이상): 표 — 관련 항목을 한 칸에 묶어 노트북 화면에서도 가로 스크롤이 생기지 않도록 구성
                이름 칸: 이름 + 영문명 / 생년월일 칸: 생년월일 + 성별 / 연락처 칸: 전화번호 + 이메일 */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                    <th className="whitespace-nowrap px-4 py-3">학생번호</th>
                    <th className="px-4 py-3">이름 / 영문명</th>
                    <th className="whitespace-nowrap px-4 py-3">생년월일 · 성별</th>
                    <th className="px-4 py-3">국적</th>
                    <th className="px-4 py-3">연락처</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="whitespace-nowrap px-4 py-3">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {state.students.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => router.push(`/admin/students/${student.id}`)}
                      className="cursor-pointer border-b border-slate-100 align-top transition-colors last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                        {student.student_no ?? <span className="font-sans font-normal text-slate-400">미발급</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/students/${student.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {student.name}
                        </Link>
                        {student.name_en && <p className="mt-0.5 text-xs text-slate-500">{student.name_en}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(student.birth_date)}
                        {student.gender && <p className="mt-0.5 text-xs text-slate-500">{student.gender}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{show(student.nationality)}</td>
                      <td className="max-w-[16rem] px-4 py-3 text-slate-600">
                        <p className="whitespace-nowrap">{show(student.phone)}</p>
                        {student.email && (
                          <p className="mt-0.5 truncate text-xs text-slate-500" title={student.email}>
                            {student.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge value={student.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateKst(student.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일·태블릿: 카드 */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {state.students.map((student) => (
                <li key={student.id}>
                  <Link href={`/admin/students/${student.id}`} className="block px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {student.name}
                          {student.name_en && <span className="ml-1.5 text-sm font-normal text-slate-500">{student.name_en}</span>}
                        </p>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-slate-600">{student.student_no ?? "학생번호 미발급"}</p>
                      </div>
                      <StatusBadge value={student.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><dt className="inline text-slate-400">생년월일 </dt><dd className="inline text-slate-700">{formatDate(student.birth_date)}</dd></div>
                      <div><dt className="inline text-slate-400">성별 </dt><dd className="inline text-slate-700">{show(student.gender)}</dd></div>
                      <div><dt className="inline text-slate-400">국적 </dt><dd className="inline text-slate-700">{show(student.nationality)}</dd></div>
                      <div><dt className="inline text-slate-400">등록일 </dt><dd className="inline text-slate-700">{formatDateKst(student.created_at)}</dd></div>
                      <div className="col-span-2"><dt className="inline text-slate-400">전화 </dt><dd className="inline text-slate-700">{show(student.phone)}</dd></div>
                      <div className="col-span-2 truncate"><dt className="inline text-slate-400">이메일 </dt><dd className="inline text-slate-700">{show(student.email)}</dd></div>
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
