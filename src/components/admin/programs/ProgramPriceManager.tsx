"use client";

// /admin/programs 프로그램·가격 관리
// 데이터 흐름: PostgreSQL(programs → program_options → program_prices) → Prisma → GET /api/programs → 이 화면
//
// 화면 구조
//   정규반: 인텐시브 ESL / 비즈니스 실무 영어 / 유학 준비
//   캠프반: 여름/겨울 방학캠프 / 상시 가족캠프
//   이전 프로그램(REGULAR, CAMP): 기존 수납 기록·가격 이력 보존용 (홈페이지 미사용, 접어서 표시)
//
// - 기간(주수)은 프로그램별로 「+ 기간 추가」에서 직접 입력 (코드에 2/4/8/12주 고정 없음)
// - 기간마다 [수정] 하나: 금액·통화·적용 시작일·종료일·활성(기간 사용)·홈페이지 표시·표시 순서를 한 번에 저장
//   (POST /api/programs/options/[id]/edit). 금액을 바꾸면 새 가격 행 추가 + 기존 가격은 종료 처리 → 가격 이력 보존
// - 가격 이력: 수정 패널의 「가격 이력 보기」. 라디오 = 「현재 적용 가격 선택」(POST /api/programs/prices/[id]/current),
//   「정정」 = 잘못 입력한 이력 행 바로잡기(기존 PriceForm, PUT /api/programs/prices/[id])
// - 홈페이지 표시는 프로그램별 최대 4개 (화면 + 서버)
// - 홈페이지(학비표·맞춤견적서)는 빌드 시 「홈페이지 표시」 + 현재 적용 가격이 있는 기간만 사용
// - 등록·수정은 SUPER_ADMIN, ADMIN (STAFF는 조회만). 권한은 서버가 DB 기준으로 다시 확인

import { useCallback, useEffect, useState } from "react";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";
import { formatDateKst } from "@/components/admin/students/format";
import { PRICE_STATE_LABELS, formatWon, priceState, type PriceState } from "@/lib/programPriceValidation";
import { selectPublicOptions } from "@/lib/publicTuition";
import {
  MAX_PUBLIC_OPTIONS,
  PROGRAM_CODE_ADMIN_NAMES,
  PROGRAM_CODE_GROUPS,
  PROGRAM_GROUP_ADMIN_LABELS,
  isProgramCode,
  type ProgramCode,
} from "@/config/programPricing";
import { PROGRAM_GROUP_ORDER } from "@/config/programs";
import PriceForm, { type PriceRow } from "./PriceForm";
import CurrentPriceDialog from "./CurrentPriceDialog";
import OptionCreateForm from "./OptionCreateForm";
import OptionEditForm from "./OptionEditForm";
import type { OptionRow, ProgramRow, SaveResult } from "./types";

type LoadState =
  | { kind: "loading" }
  | { kind: "sessionExpired" }
  | { kind: "error"; message: string }
  | { kind: "ready"; programs: ProgramRow[]; canManage: boolean; today: string; maxPublic: number };

/** 열려 있는 입력창: 기간 「수정」 패널(가격 이력 행 정정 포함) 또는 「+ 기간 추가」 */
type Editor =
  | { type: "edit"; optionId: string; correctPriceId: string | null }
  | { type: "newOption"; programId: string }
  | null;

/** 현재 적용 가격으로 선택하려는 가격 (확인창 표시용) */
type Pick = { label: string; target: PriceRow; rows: PriceRow[] } | null;

const LOAD_TIMEOUT_MS = 15_000;

const STATE_STYLES: Record<PriceState, string> = {
  current: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-200",
  ended: "bg-slate-100 text-slate-500 ring-slate-200",
  inactive: "bg-slate-50 text-slate-400 ring-slate-200",
};

function StateBadge({ state }: { state: PriceState }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATE_STYLES[state]}`}>
      {PRICE_STATE_LABELS[state]}
    </span>
  );
}

function period(row: PriceRow): string {
  return `${row.valid_from.slice(0, 10)} ~ ${row.valid_until ? row.valid_until.slice(0, 10) : "종료일 없음"}`;
}

function programName(program: ProgramRow): string {
  return program.name || (isProgramCode(program.code) ? PROGRAM_CODE_ADMIN_NAMES[program.code] : program.code);
}

function optionLabel(program: ProgramRow, option: OptionRow): string {
  return `${programName(program)} ${option.duration_weeks}주`;
}

/** 홈페이지 표시 중(활성)인 기간 수 */
function publicCount(program: ProgramRow, excludeOptionId?: string): number {
  return program.program_options.filter((o) => o.is_public && o.is_active && o.id !== excludeOptionId).length;
}

/** 오늘 빌드하면 홈페이지에 나갈 기간 (홈페이지와 같은 선택 함수 사용) */
function homepagePreview(program: ProgramRow) {
  return selectPublicOptions(
    program.program_options.map((option) => {
      const current = option.program_prices.find((row) => row.id === option.current_price_id) ?? null;
      return {
        optionId: option.id,
        weeks: option.duration_weeks,
        isPublic: option.is_public,
        isActive: option.is_active,
        displayOrder: option.display_order,
        currentPrice: current ? { price: current.price, currency: current.currency ?? "" } : null,
      };
    })
  );
}

const GRID = "lg:grid lg:grid-cols-[5rem_minmax(8rem,1fr)_3.5rem_minmax(11rem,1.2fr)_6rem_8rem_3rem_8rem] lg:items-center lg:gap-3";

export default function ProgramPriceManager() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [editor, setEditor] = useState<Editor>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pick, setPick] = useState<Pick>(null);

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, LOAD_TIMEOUT_MS);

    fetch("/api/programs", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setState({ kind: "sessionExpired" });
          return;
        }
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !data?.success) {
          setState({ kind: "error", message: data?.message || "프로그램 정보를 불러오지 못했습니다." });
          return;
        }
        setState({
          kind: "ready",
          programs: data.programs ?? [],
          canManage: data.canManage === true,
          today: data.today,
          maxPublic: typeof data.maxPublicOptions === "number" ? data.maxPublicOptions : MAX_PUBLIC_OPTIONS,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        if (!timedOut) console.error("프로그램 조회 오류:", error);
        setState({
          kind: "error",
          message: timedOut
            ? "프로그램 정보를 불러오는 데 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요."
            : "프로그램 정보를 불러오는 중 오류가 발생했습니다.",
        });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [reloadKey]);

  const handleDone = useCallback((result: SaveResult) => {
    if (result.kind === "sessionExpired") {
      setSessionExpired(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSessionExpired(false);
    setEditor(null);
    setNotice(result.message);
    setReloadKey((key) => key + 1);
  }, []);

  const closePick = useCallback(() => setPick(null), []);

  function openEditor(next: Editor) {
    setNotice("");
    setEditor(next);
  }

  const header = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Programs</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">프로그램 관리</h1>
      <p className="mt-2 text-sm text-slate-500">
        프로그램별 기간(주수)과 수강료를 관리합니다. 수납 등록 시 수강 시작일에 적용되는 가격이 기본 수강료로 사용됩니다.
      </p>
    </div>
  );

  if (state.kind === "loading") {
    return (
      <section>
        {header}
        <div className="mt-6 space-y-4" aria-label="프로그램 정보 불러오는 중">
          {[0, 1].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-white shadow" />
          ))}
        </div>
      </section>
    );
  }

  if (state.kind === "sessionExpired") {
    return (
      <section>
        {header}
        <div className="mt-6">
          <SessionExpiredNotice />
        </div>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section>
        {header}
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-base font-semibold text-slate-900">프로그램 정보를 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-slate-500">{state.message}</p>
          <p className="mt-1 text-xs text-slate-400">
            프로그램 구조 개편 후 처음이라면 DB 마이그레이션(prisma/sql/20261006_02_program_options_public.sql)과 npx prisma generate 실행 여부를 확인해 주세요.
          </p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: "loading" });
              setReloadKey((key) => key + 1);
            }}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            다시 시도
          </button>
        </div>
      </section>
    );
  }

  const { programs, canManage, today, maxPublic } = state;
  const byCode = new Map(programs.map((program) => [program.code, program]));
  const otherPrograms = programs.filter((program) => !isProgramCode(program.code));

  function renderOption(program: ProgramRow, option: OptionRow, legacy: boolean) {
    const prices = option.program_prices;
    const current = prices.find((row) => row.id === option.current_price_id) ?? null;
    const scheduled = prices
      .filter((row) => priceState(row, today) === "scheduled")
      .sort((a, b) => (a.valid_from < b.valid_from ? -1 : 1))[0];
    const label = optionLabel(program, option);
    const panelOpen = editor?.type === "edit" && editor.optionId === option.id ? editor : null;
    const historyOpen = !!openHistory[option.id];
    // 수정 기준 가격: 현재 적용 가격 → 없으면 가장 가까운 적용 예정 가격
    const base = current ?? scheduled ?? null;
    // 홈페이지 표시로 켜져 있지만 실제로는 나가지 않는 경우 (가격 없음 / 사용 중지)
    const publicButHidden = option.is_public && (!option.is_active || !current || current.currency?.trim() !== "KRW");

    return (
      <li key={option.id} className="px-5 py-4 sm:px-6">
        <div className={`flex flex-col gap-2 ${GRID}`}>
          {/* 기간 */}
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-slate-900">{option.duration_weeks}주</p>
            {!option.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">사용 중지</span>}
          </div>

          {/* 금액 */}
          <div className="min-w-0">
            {current ? (
              <p className="text-lg font-bold tabular-nums text-slate-900">{formatWon(current.price)}</p>
            ) : (
              <p className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">가격 미설정</p>
            )}
            {scheduled && <p className="mt-0.5 text-xs text-sky-700">적용 예정: {formatWon(scheduled.price)} ({scheduled.valid_from.slice(0, 10)}~)</p>}
          </div>

          {/* 통화 */}
          <p className="text-sm text-slate-600">
            <span className="text-xs text-slate-400 lg:hidden">통화 </span>
            {current?.currency?.trim() || "-"}
          </p>

          {/* 적용기간 */}
          <p className="text-sm text-slate-600">
            <span className="text-xs text-slate-400 lg:hidden">적용기간 </span>
            {current ? period(current) : "-"}
          </p>

          {/* 상태 */}
          <div>
            {current ? (
              <StateBadge state="current" />
            ) : scheduled ? (
              <StateBadge state="scheduled" />
            ) : (
              <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                가격 없음
              </span>
            )}
          </div>

          {/* 홈페이지 표시 */}
          <div>
            {legacy ? (
              <span className="text-xs text-slate-400">미사용</span>
            ) : option.is_public ? (
              <div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${publicButHidden ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
                  ✓ 표시
                </span>
                {publicButHidden && (
                  <p className="mt-0.5 text-[11px] leading-tight text-amber-700">
                    {!option.is_active ? "사용 중지라 미노출" : "현재 가격 없어 미노출"}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400"><span className="lg:hidden">홈페이지 </span>미표시</span>
            )}
          </div>

          {/* 순서 */}
          <p className="text-sm tabular-nums text-slate-600">
            <span className="text-xs text-slate-400 lg:hidden">순서 </span>
            {!legacy && option.is_public && option.display_order !== null ? option.display_order : "-"}
          </p>

          {/* 관리: 하나의 [수정] (조회 권한만 있으면 [가격 이력]) */}
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {canManage ? (
              <button
                type="button"
                onClick={() => (panelOpen ? setEditor(null) : openEditor({ type: "edit", optionId: option.id, correctPriceId: null }))}
                aria-expanded={!!panelOpen}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                수정
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOpenHistory((prev) => ({ ...prev, [option.id]: !prev[option.id] }))}
                aria-expanded={historyOpen}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                가격 이력 {prices.length}건 {historyOpen ? "▲" : "▼"}
              </button>
            )}
          </div>
        </div>

        {panelOpen && canManage && (
          <div className="mt-4 space-y-3">
            {panelOpen.correctPriceId ? (
              <PriceForm
                key={`${option.id}-correct-${panelOpen.correctPriceId}`}
                optionId={option.id}
                optionLabel={`${label} · 가격 이력 정정`}
                editing={prices.find((row) => row.id === panelOpen.correctPriceId) ?? null}
                existing={prices}
                onCancel={() => openEditor({ type: "edit", optionId: option.id, correctPriceId: null })}
                onDone={handleDone}
              />
            ) : (
              <OptionEditForm
                key={`edit-${option.id}-${base?.id ?? "none"}`}
                option={option}
                label={label}
                prices={prices}
                base={base}
                today={today}
                otherPublicCount={publicCount(program, option.id)}
                maxPublic={maxPublic}
                legacy={legacy}
                onCancel={() => setEditor(null)}
                onDone={handleDone}
              />
            )}
            <button
              type="button"
              onClick={() => setOpenHistory((prev) => ({ ...prev, [option.id]: !prev[option.id] }))}
              aria-expanded={historyOpen}
              className="text-xs font-semibold text-slate-600 underline-offset-2 hover:underline"
            >
              가격 이력 {prices.length}건 {historyOpen ? "접기 ▲" : "보기 ▼"}
            </button>
          </div>
        )}

        {historyOpen && (panelOpen || !canManage) && (
          <div className="mt-3">
            {prices.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">등록된 가격이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="w-20 whitespace-nowrap px-3 py-2 text-center">현재 적용</th>
                      <th className="px-3 py-2">금액</th>
                      <th className="px-3 py-2">통화</th>
                      <th className="px-3 py-2">적용 기간</th>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">등록일</th>
                      {canManage && <th className="px-3 py-2 text-right">잘못 입력한 행</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((row) => (
                      <tr key={row.id} className={`border-t border-slate-100 ${row.id === option.current_price_id ? "bg-emerald-50/40" : ""}`}>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="radio"
                            name={`current-price-${option.id}`}
                            checked={row.id === option.current_price_id}
                            disabled={!canManage}
                            onChange={() => {
                              if (row.id === option.current_price_id) return;
                              setNotice("");
                              setPick({ label, target: row, rows: prices });
                            }}
                            aria-label={`${formatWon(row.price)}을(를) 현재 적용 가격으로 선택`}
                            className="h-4 w-4 cursor-pointer accent-slate-900 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-slate-900">{formatWon(row.price)}</td>
                        <td className="px-3 py-2 text-slate-600">{row.currency?.trim()}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{period(row)}</td>
                        <td className="px-3 py-2"><StateBadge state={priceState(row, today)} /></td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-500">{formatDateKst(row.created_at)}</td>
                        {canManage && (
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => openEditor({ type: "edit", optionId: option.id, correctPriceId: row.id })}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              정정
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </li>
    );
  }

  function renderProgram(program: ProgramRow, legacy: boolean) {
    const options = [...program.program_options].sort((a, b) => a.duration_weeks - b.duration_weeks);
    const count = publicCount(program);
    const preview = legacy ? [] : homepagePreview(program);
    const addingHere = editor?.type === "newOption" && editor.programId === program.id;

    return (
      <section key={program.id} className="rounded-2xl bg-white shadow">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5 sm:px-6">
          <h3 className="text-base font-semibold text-slate-900">{programName(program)}</h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">{program.code}</span>
          {!program.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">운영 중지</span>}
          <span className="ml-auto flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {!legacy && (
              <span className={`rounded-full px-2 py-0.5 font-semibold ${count > maxPublic ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                홈페이지 표시 {count}/{maxPublic}
              </span>
            )}
            기간 {options.length}개
          </span>
        </div>

        {!legacy && (
          <p className="border-b border-slate-100 bg-slate-50/60 px-5 py-2 text-xs text-slate-500 sm:px-6">
            오늘 기준 홈페이지 노출:{" "}
            {preview.length > 0 ? (
              <span className="font-semibold text-slate-700">{preview.map((row) => `${row.weeks}주 ${formatWon(row.price)}`).join(" · ")}</span>
            ) : (
              <span className="font-semibold text-amber-700">없음 (홈페이지에 &ldquo;상담 시 안내&rdquo;로 표시)</span>
            )}
            <span className="ml-1 text-slate-400">— 변경 후 build:netlify 재빌드·업로드 시 반영</span>
          </p>
        )}

        {options.length === 0 ? (
          <p className="m-5 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 sm:m-6">등록된 기간이 없습니다.</p>
        ) : (
          <>
            <div className={`hidden border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-500 sm:px-6 ${GRID}`}>
              <span>기간</span>
              <span>금액</span>
              <span>통화</span>
              <span>적용기간</span>
              <span>상태</span>
              <span>홈페이지 표시</span>
              <span>순서</span>
              <span className="text-right">관리</span>
            </div>
            <ul className="divide-y divide-slate-100">{options.map((option) => renderOption(program, option, legacy))}</ul>
          </>
        )}

        {!legacy && canManage && (
          <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
            {addingHere ? (
              <OptionCreateForm
                key={`new-${program.id}`}
                programId={program.id}
                programName={programName(program)}
                existingWeeks={program.program_options.map((option) => option.duration_weeks)}
                publicCount={count}
                maxPublic={maxPublic}
                onCancel={() => setEditor(null)}
                onDone={handleDone}
              />
            ) : (
              <button
                type="button"
                onClick={() => openEditor({ type: "newOption", programId: program.id })}
                className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                + 기간 추가
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      {header}

      {sessionExpired && (
        <div className="mt-4">
          <SessionExpiredNotice />
        </div>
      )}
      {notice && (
        <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}
      {!canManage && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600">
          가격 조회만 가능합니다. 기간·가격 등록과 수정은 관리자(SUPER_ADMIN, ADMIN)만 할 수 있습니다.
        </div>
      )}
      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-xs leading-relaxed text-sky-900">
        홈페이지 연수비용 학비표와 실시간 맞춤견적서는 과정별로 <b>「홈페이지 표시」가 켜진 기간 중 현재 적용 가격이 있는 기간만</b> 최대 {maxPublic}개까지
        표시 순서대로 보여 줍니다. 가격이 없는 기간은 표시되지 않으며 다른 기간 금액으로 계산하지 않습니다.
        공개 홈페이지는 정적 배포이므로 변경 후 <b>npm.cmd run build:netlify</b> 로 다시 빌드해 Netlify Drop에 업로드해야 반영됩니다.
      </div>

      {PROGRAM_GROUP_ORDER.map((groupId) => (
        <div key={groupId} className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">{PROGRAM_GROUP_ADMIN_LABELS[groupId]}</h2>
          <div className="mt-3 space-y-6">
            {PROGRAM_CODE_GROUPS[groupId].map((code: ProgramCode) => {
              const program = byCode.get(code);
              if (!program) {
                return (
                  <div key={code} className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                    <p className="font-semibold">
                      {PROGRAM_CODE_ADMIN_NAMES[code]} <span className="font-mono text-xs">({code})</span> 프로그램이 DB에 없습니다.
                    </p>
                    <p className="mt-1 text-xs">마이그레이션 SQL(prisma/sql/20261006_02_program_options_public.sql)을 실행하면 추가됩니다.</p>
                  </div>
                );
              }
              return renderProgram(program, false);
            })}
          </div>
        </div>
      ))}

      {otherPrograms.length > 0 && (
        <div className="mt-10">
          <button
            type="button"
            onClick={() => setLegacyOpen((open) => !open)}
            aria-expanded={legacyOpen}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span>
              이전 프로그램 ({otherPrograms.map((program) => program.code).join(", ")})
              <span className="ml-2 text-xs font-normal text-slate-400">기존 수납 기록·가격 이력 보존용 · 홈페이지 미사용</span>
            </span>
            <span aria-hidden="true">{legacyOpen ? "▲" : "▼"}</span>
          </button>
          {legacyOpen && <div className="mt-3 space-y-6">{otherPrograms.map((program) => renderProgram(program, true))}</div>}
        </div>
      )}

      {pick && canManage && (
        <CurrentPriceDialog
          optionLabel={pick.label}
          target={pick.target}
          rows={pick.rows}
          today={today}
          onCancel={closePick}
          onDone={(result) => {
            setPick(null);
            handleDone(result);
          }}
        />
      )}
    </section>
  );
}
