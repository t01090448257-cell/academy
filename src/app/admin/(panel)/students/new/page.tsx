// /admin/students/new 학생 등록
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 저장 API(POST /api/students)에서 처리합니다.
//
// [Stage 2] 홈페이지 상담에서 신규 학생 등록
//   /admin/students/new?fromConsultation=상담ID&applicant=self|guardian
//   - 상담을 서버에서 다시 확인: 존재 / source = "homepage" / 아직 학생 미연결
//   - 확인되면 신청자 정보(이름·연락처·이메일)를 등록 화면 초기값으로 전달 (상담 데이터는 읽기만 함)
//   - fromConsultation이 없으면 기존 학생 등록 화면 그대로
//   - 저장은 기존 POST /api/students 그대로, 등록 후 PATCH /api/consultations/[id]/student-link로 연결 (StudentCreateForm)

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STUDENT_STATUS } from "@/lib/studentValidation";
import StudentCreateForm, { type ConsultationPrefill } from "@/components/admin/students/StudentCreateForm";

export const metadata = {
  title: "학생 등록 | SYA Academy Administration",
};

// 매 요청마다 DB의 최신 상태값을 읽도록 정적 생성하지 않음
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ fromConsultation?: string; applicant?: string }>;
}

/** 홈페이지 상담 신청으로 접수된 상담의 source 값 (POST /api/public/consultations가 저장) */
const HOMEPAGE_SOURCE = "homepage";

/** 상담에서 등록할 수 없는 경우 안내 화면 */
function ConsultationPrefillError({ consultationId, message }: { consultationId: string | null; message: string }) {
  return (
    <section>
      <Link
        href={consultationId ? `/admin/consultations/${encodeURIComponent(consultationId)}` : "/admin/consultations"}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <span aria-hidden="true">←</span> {consultationId ? "상담 상세" : "상담 목록"}
      </Link>
      <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow sm:p-12">
        <p className="text-lg font-semibold text-slate-900">상담에서 신규 학생 등록을 진행할 수 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </section>
  );
}

export default async function AdminStudentNewPage({ searchParams }: PageProps) {
  const { fromConsultation, applicant } = await searchParams;

  // [Stage 2] 홈페이지 상담에서 들어온 경우: 상담 확인 + 초기값 준비
  let prefill: ConsultationPrefill | undefined;
  if (fromConsultation !== undefined) {
    if (!/^\d{1,18}$/.test(fromConsultation)) {
      return <ConsultationPrefillError consultationId={null} message="올바르지 않은 상담 ID입니다." />;
    }
    if (applicant !== "self" && applicant !== "guardian") {
      return (
        <ConsultationPrefillError
          consultationId={fromConsultation}
          message="신청자 역할(학생 본인 신청 / 보호자 신청)을 상담 상세 화면에서 다시 선택해 주세요."
        />
      );
    }

    const consultation = await prisma.consultations.findUnique({
      where: { id: BigInt(fromConsultation) },
      select: { id: true, source: true, student_id: true, name: true, phone: true, email: true },
    });
    if (!consultation) {
      return <ConsultationPrefillError consultationId={null} message="상담 기록을 찾을 수 없습니다." />;
    }
    if (consultation.source !== HOMEPAGE_SOURCE) {
      return (
        <ConsultationPrefillError
          consultationId={fromConsultation}
          message="홈페이지에서 접수된 상담만 신규 학생 등록과 자동 연결을 사용할 수 있습니다."
        />
      );
    }
    if (consultation.student_id !== null) {
      return (
        <ConsultationPrefillError
          consultationId={fromConsultation}
          message="이미 학생이 연결된 상담입니다. 상담 상세 화면에서 연결 상태를 확인해 주세요."
        />
      );
    }

    prefill = {
      consultationId: consultation.id.toString(),
      applicant,
      name: consultation.name,
      phone: consultation.phone,
      email: consultation.email,
    };
  }

  // 상태 선택지: schema 기본값(active) + 현재 DB에서 실제 사용 중인 상태값 (임의로 추가하지 않음)
  const rows = await prisma.students.findMany({
    distinct: ["status"],
    select: { status: true },
    orderBy: { status: "asc" },
  });
  const statusOptions = Array.from(
    new Set([DEFAULT_STUDENT_STATUS, ...rows.map((row: { status: string }) => row.status)])
  );

  return <StudentCreateForm statusOptions={statusOptions} fromConsultation={prefill} />;
}
