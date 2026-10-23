SYA Academy - LIVE & LEARN「현지 학교 체험(LOCAL SCHOOL EXPERIENCE)」블록 최종 수정본
파일: local_school_experience_final_20261011.zip
기준 프로젝트: 백업 원본 academy_20261011_0029.zip (local_school_name_removal_20261011.zip 미적용 상태 기준)

이번 작업에서 DB 접속, SQL 실행, 배포를 하지 않았습니다.
상담 신청 기능, API, DB, Prisma 스키마, Stage 6 파일, 다른 홈페이지 섹션, 프로그램 상세 화면은 수정하지 않았습니다.

==========================================================================
1. 적용 방법
==========================================================================
  ZIP 안 academy 폴더의 파일을 C:\Users\asatt\academy 아래 같은 경로에 덮어쓰기/추가하면 됩니다.
  이 ZIP 하나에 학교명 제거 + 사진 교체가 모두 들어 있으므로
  local_school_name_removal_20261011.zip은 따로 적용하지 않아도 됩니다. (적용했더라도 이 ZIP으로 덮어쓰면 됨)

  적용 후 (PC):
    npx tsc --noEmit
    npm.cmd run build
    npm.cmd run dev → /ko, /en, /ar 홈 화면 LIVE & LEARN 섹션 확인
    공개 홈페이지 반영: npm.cmd run build:netlify → out 폴더 재업로드 (정적 배포)

==========================================================================
2. 최종 변경 파일 (기준 원본 대비 11개 + 이 보고서)
==========================================================================
  [신규] C:\Users\asatt\academy\public\images\local-school-experience-replacement.png
         - 사진 ZIP의 파일 그대로 (1536×1024, 약 2.0MB, 학교명·로고 없음)
         - 기존 사진과 같은 폴더(public\images)에 새 이름으로 추가
  [수정] C:\Users\asatt\academy\src\components\home\LiveLearnSection.tsx
         - 학교명 제거 수정본의 변경 전부 + 사진 경로 교체
           SCHOOL_IMAGE = "/images/local-school-experience-replacement.png"
  [수정] C:\Users\asatt\academy\src\types\dictionary.ts
         - 학교명 제거 수정본 그대로 (school: eyebrow / title / tagline / description / conditionNote / imageAlt)
  [수정] C:\Users\asatt\academy\src\dictionaries\ko.json, en.json, ja.json, vi.json, zh-TW.json, mn.json, ru.json, ar.json
         - 학교명 제거 수정본 그대로 + 사진 대체 텍스트(imageAlt) 1줄만 새 사진 내용에 맞게 수정

  보존: C:\Users\asatt\academy\public\images\class_1.jpeg — 삭제·덮어쓰기 없음, ZIP에도 넣지 않음
        (원본과 바이트 단위로 같음 확인. 화면 코드에서는 더 이상 참조하지 않음)

==========================================================================
3. 두 ZIP에서 가져온 변경 사항 (통합 확인)
==========================================================================
  [local_school_name_removal_20261011.zip] — 내용 그대로 유지
    - 업로드된 ZIP의 10개 파일이 직전 작업 결과와 바이트 단위로 같음 확인 (차이·충돌 없음)
    - 학교명(SAGE PREP SCHOOLHOUSE) 제목 → 언어별「현지 학교 체험」제목
    - 학교 공식 홈페이지 링크 버튼 제거, 학교명이 들어간 "SYA 운영 학교 아님" 문장 제거
    - 상단 작은 제목: 전 언어 LOCAL SCHOOL EXPERIENCE
    - 한국어 설명·안내 문구, 다른 7개 언어 번역 — 변경 없음
    - 그 ZIP의 LOCAL_SCHOOL_NAME_REMOVAL_README.txt는 "사진 교체 필요" 내용이 이제 맞지 않아 이 보고서로 대체
  [local_school_experience_photo_and_instructions.zip]
    - local-school-experience-replacement.png 추가
    - LiveLearnSection.tsx 사진 경로만 변경 (+ 사진 설명 주석 2곳)
  [이번에 추가로 바꾼 부분 — 사진 교체에 필요한 범위]
    - 8개 언어 imageAlt (화면에 보이지 않는 사진 설명. 새 사진은 "학생들이 앉아 있는 모습"이 아니라 수업 장면이라 맞춤)
        ko: 현지 학교 교실에서 선생님과 학생들이 함께 수업하는 모습
        en: A teacher and students having a class together in a local school classroom
        ja: 現地の学校の教室で先生と生徒たちが一緒に授業をしている様子
        vi: Giáo viên và học sinh cùng học trong một lớp học của trường địa phương
        zh-TW: 老師與學生在當地學校教室裡一起上課的情景
        mn: Орон нутгийн сургуулийн ангид багш, сурагчид хамтдаа хичээллэж буй нь
        ru: Учитель и ученики на уроке в классе местной школы
        ar: معلّمة وطلاب يتشاركون درسًا في فصل بمدرسة محلية
    - 제목·설명·안내 문구는 다시 쓰지 않음

==========================================================================
4. 사진 표시 방식
==========================================================================
  - 레이아웃·크기·반응형 설정(4:3 틀, object-cover, 가운데 기준, sizes 값)은 기존 그대로
  - 새 사진은 3:2 비율이라 4:3 틀에서 좌우가 각각 약 6%씩 잘립니다
    (잘리는 부분: 왼쪽 학생 어깨 일부, 오른쪽 학생 팔 일부 — 선생님·화이트보드·학생 얼굴은 모두 보임)
  - 공개 홈페이지(Netlify Drop)는 이미지 최적화 없이 원본(약 2.0MB)을 그대로 내려받습니다.
    같은 섹션의 기존 사진(island-hopping-1.png, 약 2.9MB)과 비슷한 수준입니다.
  - 참고: 사진이 실제 SYA·현지 학교 촬영 사진이 아니라면(연출·생성 이미지 등)
    실제 수업 장면처럼 오해되지 않는지 확인해 주세요. 사진 출처·사용 권리도 함께 확인을 권장합니다.

==========================================================================
5. 8개 언어 확인 결과 (자동 검사)
==========================================================================
  언어   | 제목                                | 항목 6개 일치 | 빈 값 | 학교명 | 상단 제목
  ko     | 현지 학교 체험                      | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  en     | Local School Experience             | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  ja     | 現地学校体験                        | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  vi     | Trải nghiệm trường học địa phương   | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  zh-TW  | 當地學校體驗                        | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  mn     | Орон нутгийн сургуулийн туршлага    | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  ru     | Опыт местной школы                  | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  ar     | تجربة المدرسة المحلية               | ✔            | 없음  | 없음   | LOCAL SCHOOL EXPERIENCE
  - 한국어 설명·안내 문구가 요청 문구와 글자 단위로 같음 확인 (설명의 줄바꿈 \n은 데스크톱 줄바꿈 위치만 표시)
  - 제휴·파트너·공식 표현 없음

==========================================================================
6. 검사 구분
==========================================================================
  [실행 성공]
    1) 학교명 제거 수정본 통합: 업로드 ZIP 10개 파일 = 직전 결과(바이트 동일), 최종본과의 차이는 사진 경로·주석·imageAlt뿐
    2) 새 사진 포함: public\images\local-school-experience-replacement.png 존재
    3) LiveLearnSection.tsx가 새 사진을 참조 (SCHOOL_IMAGE)
    4) class_1.jpeg 보존: 원본과 동일, src 화면 코드에서 참조 없음
    5) 8개 사전 school 항목 일치·빈 값 없음 (위 표)
    6) 블록에 학교명·외부 링크(href, target="_blank")·외부 링크 아이콘 없음
    7) 이미지 경로 확인: 컴포넌트의 /images/... 경로 2개 모두 public 폴더에 실제 파일 있음 (대소문자 포함 일치)
    -  TS/TSX 2개 파일 구문 검사(transpile — 타입 검사 아님): 오류 0
    -  기준 원본 대비 변경 파일이 위 2.의 목록뿐임 확인
  [환경 제약으로 미실행]
    8) npx tsc --noEmit, npm.cmd run build — 작업 환경에서 npm 패키지 저장소 접속이 조직 네트워크 정책으로
       차단되어 의존 패키지를 설치할 수 없음 (이전 작업에서 차단 확인, 이번에는 재시도하지 않음)
  [미확인]
    - 브라우저 확인을 하지 못했습니다. 실제 화면의 사진 잘림 정도, 8개 언어 줄바꿈, 아랍어(RTL) 표시는
      PC에서 직접 확인이 필요합니다.

==========================================================================
7. 범위 밖으로 남아 있는 사항 (이번 작업에서 수정하지 않음)
==========================================================================
  - 프로그램 상세 화면(유학 준비·상시 가족캠프 탭, 캠프 페이지)의 현지 학교 안내에는 학교명과 학교 홈페이지 링크가 남아 있음
    (src\components\programs\ProgramsContent.tsx, CampProgramsContent.tsx, src\config\programs.ts, 8개 사전의 programs…localSchool)
