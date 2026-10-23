"use client";

// /admin/students/[id] 학생 상세 (「수정」 → /admin/students/[id]/edit)
// 데이터 흐름: PostgreSQL → Prisma → GET /api/students/[id] → 이 화면
// 기본 정보 / 보호자(student_guardians → guardians) / 상담 이력 / 등록 이력 / 결제 이력

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { formatAmount, formatDate, formatDateTime, show, StatusBadge } from "./format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";
import { ConsultationStatusBadge, CounterpartText, consultedDateText } from "@/components/admin/consultations/ConsultationBadges";

interface Guardian {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
}

interface StudentGuardian {
  id: string;
  is_primary: boolean;
  guardians: Guardian;
}

interface Consultation {
  id: string;
  inquiry_type: string | null;
  message: string | null;
  status: string;
  created_at: string;
  consulted_at: string | null;
  counterpart_type: string;
  guardians: { name: string; relationship: string | null } | null;
  admin_users: { name: string } | null;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  status: string;
  payer_name: string | null;
}

interface Enrollment {
  id: string;
  enrollment_no: string;
  enrollment_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  base_amount: string;
  discount_amount: string;
  final_amount: string;
  programs: { code: string; name: string } | null;
  program_options: { name: string; duration_weeks: number } | null;
  payments: Payment[];
}

interface StudentDetailData {
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
  memo: string | null;
  created_at: string;
  updated_at: string;
  student_guardians: StudentGuardian[];
  consultations: Consultation[];
  enrollments: Enrollment[];
}

type LoadState =
  | { kind: "loading" }
  | { kind: "sessionExpired" }
  | { kind: "error"; message: string; notFound?: boolean }
  | { kind: "ready"; student: StudentDetailData };

/* ------------------------------------------------------------------ */
/* 공용 조각                                                            */
/* ------------------------------------------------------------------ */
function Card({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white shadow">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{count}</span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{text}</p>;
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">{children}</dd>
    </div>
  );
}

/** 작은 표 (데스크톱은 표, 모바일은 가로 스크롤) */
function SimpleTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-slate-100 align-top">
              {cells.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-slate-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StudentDetail({
  id,
  justCreated = false,
  justUpdated = false,
}: {
  id: string;
  justCreated?: boolean;
  justUpdated?: boolean;
}) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/students/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setState({ kind: "sessionExpired" });
          return;
        }
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !data?.success) {
          setState({
            kind: "error",
            message: data?.message || "학생 정보를 불러오지 못했습니다.",
            notFound: response.status === 404 || response.status === 400,
          });
          return;
        }
        setState({ kind: "ready", student: data.student as StudentDetailData });
      })
      .catch((error) => {
        console.error("학생 상세 조회 오류:", error);
        if (!cancelled) setState({ kind: "error", message: "학생 정보를 불러오는 중 오류가 발생했습니다." });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const backLink = (
    <Link href="/admin/students" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
      <span aria-hidden="true">←</span> 학생 목록
    </Link>
  );

  if (state.kind === "loading") {
    return (
      <section>
        {backLink}
        <div className="mt-4 space-y-4" aria-label="학생 정보 불러오는 중">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-white shadow" />
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow" />
        </div>
      </section>
    );
  }

  if (state.kind === "sessionExpired") {
    return (
      <section>
        {backLink}
        <div className="mt-6">
          <SessionExpiredNotice />
        </div>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section>
        {backLink}
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow sm:p-12">
          <p className="text-lg font-semibold text-slate-900">
            {state.notFound ? "학생을 찾을 수 없습니다." : "학생 정보를 불러오지 못했습니다."}
          </p>
          <p className="mt-2 text-sm text-slate-500">{state.message}</p>
        </div>
      </section>
    );
  }

  const { student } = state;
  // 등록과 연결된 결제를 한 목록으로 (최근 결제일 순)
  const payments = student.enrollments
    .flatMap((enrollment) =>
      enrollment.payments.map((payment) => ({ ...payment, enrollment_no: enrollment.enrollment_no }))
    )
    .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));

  return (
    <section>
      {backLink}

      {justCreated && (
        <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-800">학생이 등록되었습니다.</p>
          <p className="mt-1 text-sm text-emerald-700">
            자동 발급된 학생번호: <strong className="font-mono text-base text-emerald-900">{show(student.student_no)}</strong>
          </p>
        </div>
      )}

      {justUpdated && !justCreated && (
        <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-800">학생 정보가 수정되었습니다.</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {/* 학생번호를 가장 눈에 띄게 표시 */}
          <p className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-white">
            <span className="text-[11px] font-semibold tracking-wide text-white/60">학생번호</span>
            <span className="font-mono text-base font-bold tracking-wide">{student.student_no ?? "미발급"}</span>
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            {student.name}
            {student.name_en && <span className="ml-2 text-lg font-medium text-slate-500">{student.name_en}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={student.status} />
          <Link
            href={`/admin/students/${encodeURIComponent(student.id)}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            수정
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* 기본 정보 */}
        <Card title="기본 정보">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="학생번호"><span className="font-mono">{show(student.student_no)}</span></Field>
            <Field label="이름">{student.name}</Field>
            <Field label="영문명">{show(student.name_en)}</Field>
            <Field label="생년월일">{formatDate(student.birth_date)}</Field>
            <Field label="성별">{show(student.gender)}</Field>
            <Field label="국적">{show(student.nationality)}</Field>
            <Field label="전화번호">{show(student.phone)}</Field>
            <Field label="이메일">{show(student.email)}</Field>
            <Field label="상태"><StatusBadge value={student.status} /></Field>
            <Field label="등록일">{formatDateTime(student.created_at)}</Field>
            <Field label="최종 수정일">{formatDateTime(student.updated_at)}</Field>
            <Field label="메모" wide>
              {student.memo ? <span className="whitespace-pre-line">{student.memo}</span> : "-"}
            </Field>
          </dl>
        </Card>

        {/* 보호자 */}
        <Card title="보호자" count={student.student_guardians.length}>
          {student.student_guardians.length === 0 ? (
            <Empty text="등록된 보호자가 없습니다." />
          ) : (
            <SimpleTable
              headers={["보호자 이름", "관계", "전화번호", "이메일", "주 보호자"]}
              rows={student.student_guardians.map((link) => [
                <span key="n" className="font-semibold text-slate-900">{link.guardians.name}</span>,
                show(link.guardians.relationship),
                show(link.guardians.phone),
                show(link.guardians.email),
                link.is_primary ? (
                  <span key="p" className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">주 보호자</span>
                ) : (
                  "-"
                ),
              ])}
            />
          )}
        </Card>

        {/* 상담 이력 (최근 상담부터, 클릭하면 상담 상세) */}
        <Card
          title="상담 이력"
          count={student.consultations.length}
          action={
            <Link
              href={`/admin/consultations/new?studentId=${encodeURIComponent(student.id)}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              + 상담 등록
            </Link>
          }
        >
          {student.consultations.length === 0 ? (
            <Empty text="상담 기록이 없습니다." />
          ) : (
            <SimpleTable
              headers={["상담일", "상담 유형", "상담 대상", "상태", "담당자"]}
              rows={student.consultations.map((c) => [
                <Link key="d" href={`/admin/consultations/${c.id}`} className="whitespace-nowrap font-semibold text-slate-900 hover:underline">
                  {consultedDateText(c)}
                </Link>,
                <Link key="t" href={`/admin/consultations/${c.id}`} className="hover:underline">
                  {show(c.inquiry_type)}
                </Link>,
                <CounterpartText key="p" record={c} />,
                <ConsultationStatusBadge key="s" value={c.status} />,
                show(c.admin_users?.name),
              ])}
            />
          )}
        </Card>

        {/* 등록 이력 */}
        <Card
          title="등록 이력"
          count={student.enrollments.length}
          action={
            <Link
              href={`/admin/payments/new?studentId=${encodeURIComponent(student.id)}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              + 수납 등록
            </Link>
          }
        >
          {student.enrollments.length === 0 ? (
            <Empty text="등록 이력이 없습니다." />
          ) : (
            <SimpleTable
              headers={["등록번호", "프로그램", "등록 유형", "상태", "시작일", "종료일", "기본 수강료", "할인 금액", "최종 금액"]}
              rows={student.enrollments.map((e) => [
                <span key="n" className="font-mono text-xs">{e.enrollment_no}</span>,
                e.programs
                  ? `${e.programs.name}${e.program_options ? ` · ${e.program_options.name}` : ""}`
                  : "-",
                e.enrollment_type,
                <StatusBadge key="s" value={e.status} />,
                formatDate(e.start_date),
                formatDate(e.end_date),
                <span key="b" className="tabular-nums">{formatAmount(e.base_amount)}</span>,
                <span key="d" className="tabular-nums text-rose-700">-{formatAmount(e.discount_amount)}</span>,
                <span key="a" className="font-semibold tabular-nums text-slate-900">{formatAmount(e.final_amount)}</span>,
              ])}
            />
          )}
        </Card>

        {/* 결제 이력 */}
        <Card title="결제 이력" count={payments.length}>
          {payments.length === 0 ? (
            <Empty text="결제 이력이 없습니다." />
          ) : (
            <SimpleTable
              headers={["결제일", "등록번호", "금액", "결제 방법", "상태", "결제자명"]}
              rows={payments.map((p) => [
                <span key="d" className="whitespace-nowrap">{formatDateTime(p.payment_date)}</span>,
                <span key="n" className="font-mono text-xs">{p.enrollment_no}</span>,
                <span key="a" className="font-semibold tabular-nums text-slate-900">{formatAmount(p.amount)}</span>,
                p.payment_method,
                <StatusBadge key="s" value={p.status} />,
                show(p.payer_name),
              ])}
            />
          )}
        </Card>
      </div>
    </section>
  );
}
