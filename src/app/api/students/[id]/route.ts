import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import {
  phoneForCompare,
  validateStudentInput,
  type CleanGuardian,
  type CleanStudent,
  type GuardianInput,
  type StudentInput,
} from "@/lib/studentValidation";
import { findDuplicateCandidates } from "@/lib/studentDuplicates";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** URL의 id를 BigInt로 변환 (숫자가 아니면 null) */
function parseStudentId(id: string): bigint | null {
  return /^\d{1,18}$/.test(id) ? BigInt(id) : null;
}

// GET /api/students/[id] (관리자 로그인 필요)
// 학생 기본 정보 + 보호자 + 상담 이력 + 등록 이력(결제 포함)을 함께 조회합니다.
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  try {
    const { id } = await params;

    const studentId = parseStudentId(id);
    if (studentId === null) {
      return NextResponse.json(
        {
          success: false,
          message: "올바르지 않은 학생 ID입니다.",
        },
        { status: 400 }
      );
    }

    const student = await prisma.students.findUnique({
      where: {
        id: studentId,
      },
      include: {
        student_guardians: {
          include: {
            guardians: {
              // _count: 이 보호자와 연결된 학생 수 (수정 화면에서 "다른 학생과 함께 연결된 보호자" 안내용)
              include: { _count: { select: { student_guardians: true } } },
            },
          },
          orderBy: [{ is_primary: "desc" }, { id: "asc" }],
        },
        consultations: {
          // 상담일 최신순 (상담일 없는 기록은 뒤로) → 최근 등록순
          orderBy: [{ consulted_at: { sort: "desc", nulls: "last" } }, { id: "desc" }],
          include: {
            // 담당 관리자는 이름만 (비밀번호 등 다른 컬럼은 조회하지 않음)
            admin_users: { select: { name: true } },
            // 보호자 상담인 경우 보호자 이름·관계
            guardians: { select: { name: true, relationship: true } },
          },
        },
        enrollments: {
          orderBy: { created_at: "desc" },
          include: {
            programs: { select: { code: true, name: true } },
            program_options: { select: { name: true, duration_weeks: true } },
            payments: { orderBy: { payment_date: "desc" } },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "학생을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      // BigInt → 문자열, Decimal → 문자열로 변환해 JSON 직렬화 오류 방지
      student: serializeBigInt(student),
    });
  } catch (error) {
    console.error("학생 상세 조회 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "학생 조회에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

// PUT /api/students/[id] 학생 정보 + 보호자 수정 (관리자 로그인 필요)
//
// 요청 본문
//   name, name_en, birth_date, gender, nationality, phone, email, status, memo
//   guardians?: [{ id?, name, relationship, phone, email, is_primary }]
//     - id 있음: 이 학생에게 연결된 기존 보호자 수정
//     - id 없음: 새 보호자 추가
//     - 기존 보호자 중 목록에 없는 보호자: 이 학생과의 연결 해제
//       (다른 학생과 연결되어 있지 않은 보호자만 guardians에서 삭제)
//     - guardians를 보내지 않으면 보호자는 변경하지 않음
//   confirmDuplicate?, acknowledgedDuplicateIds?: 중복 의심 경고 확인 후 「그래도 수정」
//
// 학생번호(student_no)는 최초 등록 시 자동 발급된 번호이므로 보내더라도 변경하지 않습니다.
// 입력 검사는 등록과 같은 validateStudentInput, 중복 의심은 등록과 같은 findDuplicateCandidates(본인 제외)를 사용합니다.

type UpdateBody = StudentInput & {
  confirmDuplicate?: unknown;
  acknowledgedDuplicateIds?: unknown;
};

/** 이 학생과 보호자의 현재 연결 (student_guardians + guardians) */
interface GuardianLinkRow {
  id: bigint;
  guardian_id: bigint;
  is_primary: boolean;
  guardians: { name: string; relationship: string | null; phone: string | null; email: string | null };
}

interface GuardianPlan extends CleanGuardian {
  /** 기존 보호자 id (새 보호자는 null) */
  id: bigint | null;
}

/** 요청 처리 중 정해진 응답을 돌려주기 위한 오류 (트랜잭션 안에서 던지면 전체 취소) */
class UpdateRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** 등록 화면과 같은 규칙으로 "완전히 빈 보호자 행"인지 판단 (validateStudentInput은 빈 행을 저장 대상에서 제외) */
function isBlankGuardianRow(row: GuardianInput): boolean {
  return validateStudentInput({ name: "-", guardians: [row] }).data.guardians.length === 0;
}

/** 중복 의심과 관련된 값(이름·영문 이름·생년월일·전화번호·이메일)이 바뀌었는지 */
function identityChanged(
  current: { name: string; name_en: string | null; birth_date: Date | null; phone: string | null; email: string | null },
  next: CleanStudent
): boolean {
  const lower = (value: string | null) => (value ? value.trim().toLowerCase() : null);
  const currentBirth = current.birth_date ? current.birth_date.toISOString().slice(0, 10) : null;
  return (
    lower(current.name) !== lower(next.name) ||
    lower(current.name_en) !== lower(next.name_en) ||
    currentBirth !== next.birth_date ||
    phoneForCompare(current.phone) !== phoneForCompare(next.phone) ||
    lower(current.email) !== lower(next.email)
  );
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const studentId = parseStudentId(id);
  if (studentId === null) {
    return NextResponse.json(
      {
        success: false,
        message: "올바르지 않은 학생 ID입니다.",
      },
      { status: 400 }
    );
  }

  let body: UpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "요청 형식이 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }
  body = body && typeof body === "object" ? body : {};

  // 1) 입력 검사 (등록과 같은 규칙). student_no는 validateStudentInput이 읽지 않으므로 무시됨
  const { data, errors } = validateStudentInput(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: Object.values(errors)[0],
        errors,
      },
      { status: 400 }
    );
  }

  // 2) 보호자 변경 계획: 빈 행은 제외하고(검사 결과와 같은 순서), 각 행의 기존 보호자 id를 연결
  const updateGuardians = Array.isArray(body.guardians);
  const guardianPlans: GuardianPlan[] = [];
  if (updateGuardians) {
    const rawRows = (body.guardians as unknown[]).filter(
      (row): row is GuardianInput & { id?: unknown } =>
        !!row && typeof row === "object" && !isBlankGuardianRow(row as GuardianInput)
    );
    const seen = new Set<string>();
    for (let i = 0; i < rawRows.length; i += 1) {
      const rawId = rawRows[i].id;
      let guardianId: bigint | null = null;
      if (rawId !== undefined && rawId !== null && rawId !== "") {
        const text = String(rawId);
        if (!/^\d{1,18}$/.test(text) || seen.has(text)) {
          return NextResponse.json(
            {
              success: false,
              message: "보호자 정보가 올바르지 않습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
            },
            { status: 400 }
          );
        }
        seen.add(text);
        guardianId = BigInt(text);
      }
      guardianPlans.push({ ...data.guardians[i], id: guardianId });
    }
  }

  try {
    const current = await prisma.students.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, name_en: true, birth_date: true, phone: true, email: true },
    });
    if (!current) {
      return NextResponse.json(
        {
          success: false,
          message: "학생을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    // 3) 중복 의심 확인 — 수정 중인 학생 본인은 제외.
    //    이름·영문 이름·생년월일·전화번호·이메일을 바꾼 경우에만 확인합니다.
    //    (메모·상태·보호자만 고친 경우, 이미 확인하고 등록한 기존 학생 때문에 매번 경고가 뜨지 않도록)
    if (identityChanged(current, data)) {
      const duplicates = await findDuplicateCandidates(data, { excludeStudentId: studentId });
      if (duplicates.length > 0) {
        const acknowledged = new Set(
          Array.isArray(body.acknowledgedDuplicateIds)
            ? body.acknowledgedDuplicateIds.map((value) => String(value))
            : []
        );
        const confirmed =
          body.confirmDuplicate === true && duplicates.every((candidate) => acknowledged.has(candidate.id));

        if (!confirmed) {
          return NextResponse.json({
            success: false,
            duplicateSuspected: true,
            message: "비슷한 학생이 이미 등록되어 있습니다.",
            duplicates,
          });
        }
      }
    }

    // 4) 학생 + 보호자 변경을 하나의 트랜잭션으로 저장 (중간 오류 시 전체 취소)
    const student = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const updated = await tx.students.update({
        where: { id: studentId },
        data: {
          // student_no는 변경하지 않음
          name: data.name,
          name_en: data.name_en,
          // @db.Date 컬럼: 시간대 영향 없이 입력한 날짜 그대로 저장
          birth_date: data.birth_date ? new Date(`${data.birth_date}T00:00:00.000Z`) : null,
          gender: data.gender,
          nationality: data.nationality,
          phone: data.phone,
          email: data.email,
          status: data.status,
          memo: data.memo,
          updated_at: now,
        },
      });

      if (!updateGuardians) return updated;

      // 이 학생에게 현재 연결된 보호자
      const links: GuardianLinkRow[] = await tx.student_guardians.findMany({
        where: { student_id: studentId },
        include: { guardians: true },
      });
      const linkByGuardianId = new Map<string, GuardianLinkRow>(
        links.map((link) => [link.guardian_id.toString(), link])
      );

      // 다른 학생의 보호자 id를 보내 수정하는 일이 없도록, 기존 보호자 id는 이 학생과 연결된 것만 허용
      for (const plan of guardianPlans) {
        if (plan.id !== null && !linkByGuardianId.has(plan.id.toString())) {
          throw new UpdateRequestError(
            409,
            "보호자 정보가 그 사이에 변경되었습니다. 화면을 새로고침한 뒤 다시 수정해 주세요."
          );
        }
      }

      // (a) 목록에서 빠진 보호자: 이 학생과의 연결 해제 → 다른 학생과도 연결이 없으면 보호자 삭제
      //     guardians 삭제는 student_guardians로 cascade되므로, 다른 학생이 사용 중인 보호자는 삭제하지 않음
      const keptIds = new Set(guardianPlans.filter((plan) => plan.id !== null).map((plan) => plan.id!.toString()));
      for (const link of links) {
        if (keptIds.has(link.guardian_id.toString())) continue;
        await tx.student_guardians.delete({ where: { id: link.id } });
        const remaining = await tx.student_guardians.count({ where: { guardian_id: link.guardian_id } });
        if (remaining === 0) {
          await tx.guardians.delete({ where: { id: link.guardian_id } });
        }
      }

      // (b) 주 보호자 해제를 먼저 반영 (한 학생에 주 보호자가 동시에 2명이 되지 않도록)
      for (const plan of guardianPlans) {
        if (plan.id === null) continue;
        const link = linkByGuardianId.get(plan.id.toString())!;
        if (link.is_primary && !plan.is_primary) {
          await tx.student_guardians.update({ where: { id: link.id }, data: { is_primary: false } });
        }
      }

      // (c) 기존 보호자 수정 + 주 보호자 지정, (d) 새 보호자 추가 + 연결
      for (const plan of guardianPlans) {
        if (plan.id === null) {
          const savedGuardian = await tx.guardians.create({
            data: {
              name: plan.name,
              relationship: plan.relationship,
              phone: plan.phone,
              email: plan.email,
            },
          });
          await tx.student_guardians.create({
            data: {
              student_id: studentId,
              guardian_id: savedGuardian.id,
              is_primary: plan.is_primary,
            },
          });
          continue;
        }

        const link = linkByGuardianId.get(plan.id.toString())!;
        const before = link.guardians;
        if (
          before.name !== plan.name ||
          before.relationship !== plan.relationship ||
          before.phone !== plan.phone ||
          before.email !== plan.email
        ) {
          await tx.guardians.update({
            where: { id: plan.id },
            data: {
              name: plan.name,
              relationship: plan.relationship,
              phone: plan.phone,
              email: plan.email,
              updated_at: now,
            },
          });
        }
        if (!link.is_primary && plan.is_primary) {
          await tx.student_guardians.update({ where: { id: link.id }, data: { is_primary: true } });
        }
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "학생 정보가 수정되었습니다.",
      student: serializeBigInt(student),
    });
  } catch (error) {
    if (error instanceof UpdateRequestError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status }
      );
    }
    // 저장 직전에 학생이 삭제된 경우 (Prisma P2025: 수정할 레코드 없음)
    if (error && typeof error === "object" && (error as { code?: unknown }).code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: "학생을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    console.error("학생 수정 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "학생 수정에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[id] (관리자 로그인 필요 — 기능 자체는 기존 그대로)
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  try {
    const { id } = await params;

    const studentId = BigInt(id);

    const student = await prisma.students.delete({
      where: {
        id: studentId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "학생이 삭제되었습니다.",
      student: {
        id: student.id.toString(),
      },
    });
  } catch (error) {
    console.error("학생 삭제 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "학생 삭제에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}