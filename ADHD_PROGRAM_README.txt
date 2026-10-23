ADHD 맞춤형 영어교육 (ADHD-Friendly English Learning) — 1차 작업 안내
작업일: 2026-10-22
=====================================================================

[0] 최종 통합본 안내 (academy_ADHD_final_20261022.zip)
  1차 ZIP(academy_ADHD_20261022.zip)과 2차 ZIP(academy_ADHD_popup_v2_20261022.zip)을 통합하고
  ADHD 상담 팝업 제목 수정을 더한 최종본입니다. 이 ZIP 하나만 적용하면 됩니다.
  (1차·2차 ZIP을 이미 적용했더라도 이 ZIP으로 덮어쓰면 최종 상태가 됩니다)

[1] 이번 작업 범위
  - 메인 페이지 OUR PROGRAMS(REGULAR/CAMP) 바로 아래에 소개 카드 추가
  - 상세 페이지 신설: /{lang}/programs/adhd  (8개 언어 정적 생성)
  - 기존 상담 팝업 재사용 + ADHD 페이지에서 열 때만 동작하는 최소 분기
  - 상단 메뉴(Header), Footer, 기존 5개 프로그램, 가격, 기간, 계산기, 학비표: 변경 없음

[2] 변경 파일
  신규
    src\app\[lang]\programs\adhd\page.tsx
    src\components\home\AdhdProgramIntro.tsx
    src\components\programs\AdhdProgramContent.tsx
    src\config\consultationTopics.ts
    src\dictionaries\adhd\index.ts
    src\dictionaries\adhd\{ko,en,ja,vi,zh-TW,mn,ru,ar}.json
  수정
    src\app\[lang]\page.tsx                       (소개 카드 1개 삽입 + ADHD 사전 로드)
    src\types\dictionary.ts                       (파일 끝에 AdhdDictionary 타입 추가만)
    src\components\common\ConsultationModal.tsx   (topic이 있을 때만 동작하는 분기)
    src\components\common\ConsultationModalProvider.tsx (prefill.topic 전달)

[3] 변경하지 않은 것
  - DB 스키마 / Prisma 모델 / 마이그레이션: 변경 없음
  - API (src\app\api 전체, 공개 상담 API 포함): 변경 없음
  - 어드민 (src\app\admin, src\components\admin): 변경 없음
  - next.config.ts, scripts\build-netlify-drop.mjs, package.json: 변경 없음

[4] 상담 팝업 변경 내용 (ADHD 페이지에서 열 때만, 2026-10-22 최종 반영)
  - 팝업 제목: 기존 공용 제목("무료 견적서 및 입학 상담 접수") 대신 ADHD 상담 제목 표시
      ko ADHD 맞춤형 영어교육 상담 / en ADHD-Friendly English Learning Consultation
      ja ADHDに配慮した英語教育のご相談 / vi Tư vấn chương trình tiếng Anh phù hợp cho học sinh ADHD
      zh-TW ADHD 友善英語教育諮詢 / mn ADHD-тай сурагчдад тохирсон англи хэлний сургалтын зөвлөгөө
      ru Консультация по программе «Английский с учётом особенностей СДВГ» / ar استشارة تعليم الإنجليزية الملائم لاضطراب ADHD
    (제목 위 작은 문구·설명 문구는 기존 공용 문구 그대로)
  - 입력란 위에 ADHD 상담 안내 문구 표시 (8개 언어)
  - 숨기는 항목: 구분/연령 선택, 희망 교육과정, 희망 연수 기간, 관심 있는 경험(세부 한달살기·현지 학교 경험), 숙박
  - 추가 항목: 학생 나이(필수, 3~19세), 희망 수업 형태(1:1 / 소규모 그룹 / 상담 후 결정, 기본 "상담 후 결정"),
               학습 목표(선택, 1,000자)
  - 유지 항목: 학생 성함, 연락처, 이메일, 희망 과정 시작 시기, 영어 수준(라벨만 "학생의 현재 영어 수준"), 문의사항(3,500자)
  - 저장 방식 (DB·API 변경 없음 — 기존 공개 상담 API 형식 그대로 전송)
      age_group      : 학생 나이로 기존 허용값 지정 (12세 이하 child / 13세 이상 teen)
      english_level  : 기존 그대로
      program_code / duration_weeks / stay_option : 비움(NULL)
      cebu_month_stay / local_school_experience  : false
      message        : 아래 형식 (항목 이름은 언어와 관계없이 한국어, 학습 목표·문의사항은 입력한 언어 그대로)
          [ADHD 맞춤형 영어교육 상담 | ADHD-Friendly English Learning]
          학생 나이: 9세
          희망 수업 형태: 1:1 개인 맞춤 수업
          학습 목표: ...
          문의사항: ...
  - 기존 정규반·캠프·계산기·헤더에서 여는 팝업: topic을 넘기지 않으므로 기존과 동일
    (수정 전 코드와 화면 HTML·전송 데이터를 비교해 동일함을 확인)

[5] 어드민에서 ADHD 상담 찾기
  관리자 > 상담·문의 목록 검색창에 ADHD 입력
  (기존 검색이 문의 내용(message)을 대소문자 구분 없이 검색함. "1:1 개인", "소규모 그룹"으로도 검색 가능)
  상담 상세의 "상담 내용"에 학생 나이·수업 형태·학습 목표가 줄바꿈된 형태로 표시됩니다.
  희망 교육과정·숙박은 "-" 로 표시됩니다.

[6] 운영 DB 사전 확인 (읽기 전용 SQL, 실행해도 데이터가 바뀌지 않음)
  과정·기간·숙박 null 저장은 코드상 허용됩니다 (공개 API 검증 + Prisma 모델 nullable +
  관리자 화면에서 직접 등록한 상담도 program_code가 null로 저장됨).
  다만 운영 DB의 CHECK 제약 전체 목록은 이 작업 환경에서 볼 수 없었으므로, 배포 전 한 번 확인을 권장합니다.

    SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
     WHERE conrelid = 'consultations'::regclass;

    SELECT column_name, is_nullable
      FROM information_schema.columns
     WHERE table_name = 'consultations'
       AND column_name IN ('program_code', 'duration_weeks', 'stay_option', 'message');

  program_code / duration_weeks / stay_option 이 is_nullable = YES 이고,
  이 두 컬럼에 NOT NULL을 요구하는 CHECK 가 없으면 그대로 사용 가능합니다.

[7] 로컬 테스트 vs Netlify 배포 (중요)
  - 상담 저장(DB)은 API 서버가 있어야 동작합니다.
      npm.cmd run dev  → 상담 팝업 제출 시 DB 저장 O (로컬 테스트용)
      Netlify Drop     → api 폴더가 빌드에서 제외되므로 상담 제출 시 오류 문구 표시 (기존과 동일)
  - 따라서 Netlify 공개 사이트에서는 ADHD 페이지·소개 카드·팝업 화면까지만 확인할 수 있고,
    상담 "저장"은 확인할 수 없습니다. 이번 작업으로 달라진 점이 아닙니다.

[8] 빌드·확인 순서 (사용자 PC)
  1) npm.cmd run dev 종료
  2) npm.cmd run build:netlify   (DB 접속 필요: 학비를 빌드 시점에 읽음)
  3) out 폴더 확인
       out\ko\programs\adhd.html  ~  out\ar\programs\adhd.html  (8개)
       out\_redirects 에 /programs/* 규칙 포함 (자동 생성)
  4) npm.cmd run dev 로 다시 실행 후
       http://localhost:3000/ko            → OUR PROGRAMS 아래 카드, "자세히 알아보기" 이동
       http://localhost:3000/ko/programs/adhd → 상담 버튼 → 제출 → 관리자 상담 목록에서 ADHD 검색
       http://localhost:3000/ar/programs/adhd → 오른쪽→왼쪽(RTL) 표시 확인
       정규반/캠프/계산기 상담 버튼 → 배지·"상담 후 결정" 항목이 없어야 정상

[9] 운영 전 결정 필요 사항
  - 소규모 그룹 정원, 수업 시간, 비용 (현재 "상담을 통해 안내")
  - 실제로 제공 가능한 학습 지원 범위 (홈페이지 문구가 이 범위를 넘지 않도록)
  - 공식 대상 연령 범위 표기 여부 (현재 "어린이부터 청소년까지")
  - 관리자 목록에서 상담 유형으로 분류하려면 inquiry_type 저장이 필요 → 공개 API 변경(별도 승인)
