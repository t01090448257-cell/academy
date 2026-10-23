import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import type { Prisma, students as StudentRecord } from "@/generated/prisma/client";
import { validateStudentInput, type StudentInput } from "@/lib/studentValidation";
import { currentStudentNoYear, isUniqueConstraintError, nextStudentNo } from "@/lib/studentNumber";
import { findDuplicateCandidates } from "@/lib/studentDuplicates";

export const runtime = "nodejs";

/** 학생번호 충돌 시 최대 재시도 횟수 */
const STUDENT_NO_MAX_ATTEMPTS = 5;

// 학생 목록 조회 (관리자 로그인 필요)
// GET /api/students?q=검색어&status=상태
// - q: 이름 / 영문명 / 전화번호 / 학생번호 중 하나라도 포함하면 검색
// - status: students.status 값과 정확히 일치 (없거나 "all"이면 전체)
export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  try {
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
    const status = (searchParams.get("status") ?? "").trim();

    const conditions: Prisma.studentsWhereInput[] = [];

    if (q) {
      const phoneVariants = Array.from(new Set([q, q.replace(/[\s-]/g, "")])).filter(Boolean);
      conditions.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { name_en: { contains: q, mode: "insensitive" } },
          { student_no: { contains: q, mode: "insensitive" } },
          ...phoneVariants.map((value) => ({ phone: { contains: value } })),
        ],
      });
    }

    if (status && status !== "all") {
      conditions.push({ status });
    }

    const [students, statusRows] = await Promise.all([
      prisma.students.findMany({
        where: conditions.length ? { AND: conditions } : undefined,
        orderBy: {
          id: "desc",
        },
      }),
      // 현재 DB에서 실제로 사용 중인 상태값 (필터 선택지용)
      prisma.students.findMany({
        distinct: ["status"],
        select: { status: true },
        orderBy: { status: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      count: students.length,
      statuses: statusRows.map((row: { status: string }) => row.status),
      students: serializeBigInt(students),
    });
  } catch (error) {
    console.error("학생 조회 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "학생 조회에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

// 학생 등록 (관리자 로그인 필요)
// POST /api/students
// body: students 컬럼 + 선택 입력 guardians: [{ name, relationship, phone, email, is_primary }]
//       + 중복 의심 확인 후 다시 보낼 때: confirmDuplicate: true, acknowledgedDuplicateIds: ["12", ...]
//
// 처리 순서
// 1) 로그인 확인 → 2) 입력 검사
// 3) 중복 의심 확인 (서버에서 항상 다시 검사)
//    - 의심 학생이 있고, 관리자가 그 학생들을 모두 확인한 뒤 "그래도 새로 등록"(confirmDuplicate)한 경우가 아니면
//      저장하지 않고 duplicateSuspected 응답을 돌려줌 (차단이 아니라 확인 요청)
// 4) 트랜잭션: 학생번호 자동 발급 → 학생 등록 → 보호자 등록 → student_guardians 연결
//    - 하나라도 실패하면 전체 취소
//    - 학생번호가 동시에 같은 번호로 발급되면 UNIQUE 제약 위반 → 트랜잭션 전체를 다시 시도
export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  let body: StudentInput & { confirmDuplicate?: unknown; acknowledgedDuplicateIds?: unknown };
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

  // 학생번호는 서버가 발급하므로 클라이언트가 보낸 student_no는 사용하지 않음 (validateStudentInput이 읽지 않음)
  const { data, errors } = validateStudentInput(body ?? {});

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

  try {
    // 3) 중복 의심 확인 — 클라이언트 검사와 관계없이 서버에서 항상 다시 확인
    const duplicates = await findDuplicateCandidates(data);
    if (duplicates.length > 0) {
      const acknowledged = new Set(
        Array.isArray(body?.acknowledgedDuplicateIds)
          ? body.acknowledgedDuplicateIds.map((value) => String(value))
          : []
      );
      const confirmed =
        body?.confirmDuplicate === true && duplicates.every((candidate) => acknowledged.has(candidate.id));

      if (!confirmed) {
        // 저장하지 않음. 관리자가 확인할 수 있도록 의심 학생 최소 정보(마스킹)를 돌려줌
        return NextResponse.json({
          success: false,
          duplicateSuspected: true,
          message: "동일한 학생으로 의심되는 학생이 있습니다.",
          duplicates,
        });
      }
    }

    // 4) 학생번호 발급 + 등록 (번호 충돌 시 재시도)
    const year = currentStudentNoYear();
    let student: StudentRecord | null = null;

    for (let attempt = 1; attempt <= STUDENT_NO_MAX_ATTEMPTS && !student; attempt += 1) {
      try {
        student = await prisma.$transaction(async (tx) => {
          const studentNo = await nextStudentNo(tx, year);

          const created = await tx.students.create({
            data: {
              student_no: studentNo,
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
            },
          });

          for (const guardian of data.guardians) {
            const savedGuardian = await tx.guardians.create({
              data: {
                name: guardian.name,
                relationship: guardian.relationship,
                phone: guardian.phone,
                email: guardian.email,
              },
            });

            await tx.student_guardians.create({
              data: {
                student_id: created.id,
                guardian_id: savedGuardian.id,
                is_primary: guardian.is_primary,
              },
            });
          }

          return created;
        });
      } catch (error) {
        // 다른 관리자가 같은 번호를 먼저 저장한 경우 → 잠시 후 다음 번호로 다시 시도
        if (isUniqueConstraintError(error) && attempt < STUDENT_NO_MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 30 + Math.floor(Math.random() * 70)));
          continue;
        }
        throw error;
      }
    }

    if (!student) {
      throw new Error("학생번호 발급 재시도 횟수를 초과했습니다.");
    }

    return NextResponse.json(
      {
        success: true,
        message: `학생이 등록되었습니다. (학생번호: ${student.student_no})`,
        student: serializeBigInt(student),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("학생 등록 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: isUniqueConstraintError(error)
          ? "학생번호 발급 중 충돌이 발생했습니다. 잠시 후 다시 시도해 주세요."
          : "학생 등록에 실패했습니다.",
      },
      { status: isUniqueConstraintError(error) ? 409 : 500 }
    );
  }
}

