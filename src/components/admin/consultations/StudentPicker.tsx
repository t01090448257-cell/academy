"use client";

// 상담 등록·수정 화면의 학생 검색·선택
// 기존 GET /api/students?q= (학생 목록 API)를 그대로 사용합니다. 학생 API는 변경하지 않습니다.
// 학생을 직접 입력하지 않고, 검색 결과에서 기존 학생을 고르게 합니다.

import { useRef, useState } from "react";
import { formatDate, show } from "@/components/admin/students/format";

export interface StudentSearchRow {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  phone: string | null;
  status: string;
}

const SEARCH_TIMEOUT_MS = 15_000;
/** 화면에 보여줄 검색 결과 최대 개수 */
const MAX_RESULTS = 20;

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; rows: StudentSearchRow[]; total: number };

export default function StudentPicker({
  onSelect,
  onSessionExpired,
  onCancel,
  disabled = false,
  error,
}: {
  onSelect: (studentId: string) => void;
  onSessionExpired: () => void;
  /** 학생 변경을 취소하고 기존 선택으로 돌아가기 (수정 화면) */
  onCancel?: () => void;
  disabled?: boolean;
  error?: string;
}) {
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const requestRef = useRef<AbortController | null>(null);

  async function runSearch() {
    const q = keyword.trim();
    if (!q) {
      setSearch({ kind: "error", message: "학생 이름, 영문 이름, 학생번호 또는 전화번호를 입력해 주세요." });
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SEARCH_TIMEOUT_MS);

    setSearch({ kind: "loading" });
    try {
      const response = await fetch(`/api/students?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (requestRef.current !== controller) return;
      if (response.status === 401) {
        setSearch({ kind: "idle" });
        onSessionExpired();
        return;
      }
      const data = await response.json().catch(() => null);
      if (requestRef.current !== controller) return;
      if (!response.ok || !data?.success) {
        setSearch({ kind: "error", message: data?.message || "학생을 검색하지 못했습니다." });
        return;
      }
      const rows: StudentSearchRow[] = Array.isArray(data.students) ? data.students : [];
      setSearch({ kind: "done", rows: rows.slice(0, MAX_RESULTS), total: rows.length });
    } catch (err) {
      if (requestRef.current !== controller) return;
      if (!timedOut) console.error("학생 검색 오류:", err);
      setSearch({
        kind: "error",
        message: timedOut
          ? "학생 검색에 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요."
          : "학생 검색 중 오류가 발생했습니다.",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function handleKeyDown(event: { key: string; preventDefault: () => void }) {
    // 상담 저장 폼이 제출되지 않도록 Enter는 학생 검색으로만 사용
    if (event.key === "Enter") {
      event.preventDefault();
      if (!disabled) runSearch();
    }
  }

  return (
    <div>
      <label htmlFor="student-picker-search" className="mb-1.5 block text-sm font-medium text-slate-700">
        학생 검색<span className="ml-0.5 text-red-500">*</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="student-picker-search"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="학생 이름, 영문 이름, 학생번호, 전화번호"
          autoComplete="off"
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 ${
            error ? "border-red-400 bg-red-50/40" : "border-slate-300"
          }`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={runSearch}
            disabled={disabled || search.kind === "loading"}
            className="whitespace-nowrap rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {search.kind === "loading" ? "검색 중..." : "학생 검색"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className="whitespace-nowrap rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              변경 취소
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}

      {search.kind === "error" && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{search.message}</p>}

      {search.kind === "done" &&
        (search.rows.length === 0 ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">검색된 학생이 없습니다.</p>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200">
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              {search.total > search.rows.length
                ? `검색 결과 ${search.total}명 중 ${search.rows.length}명을 표시합니다. 검색어를 더 구체적으로 입력해 주세요.`
                : `검색 결과 ${search.total}명 — 상담할 학생을 선택하세요.`}
            </p>
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {search.rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    disabled={disabled}
                    className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-900">{row.name}</span>
                      {row.name_en && <span className="text-sm text-slate-500">{" / "}{row.name_en}</span>}
                      <span className="font-mono text-xs text-slate-500">{" / "}{row.student_no ?? "학생번호 미발급"}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(row.birth_date)} · {show(row.phone)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
