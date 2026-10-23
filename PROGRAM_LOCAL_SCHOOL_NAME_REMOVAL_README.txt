SYA Academy - 프로그램 상세 페이지 현지 학교명 제거
기준: 백업 원본(academy_20261011_0029) + local_school_experience_final_20261011.zip 적용 상태

이번 작업에서 DB 접속, SQL 실행, 배포를 하지 않았습니다.
DB·Prisma·API·Stage 6 파일·가격·기간·조건·다른 페이지 디자인은 수정하지 않았습니다. class_1.jpeg는 그대로입니다.

==========================================================================
1. 대상 화면과 실제 파일 (검색 결과)
==========================================================================
  현지 학교 블록을 쓰는 곳은 공통 컴포넌트가 아니라 파일 2개에 각각 들어 있고, 문구는 사전의 같은 항목을 함께 씁니다.
  - 유학 준비 / 상시 가족캠프 상세 탭 (/[lang]/programs?tab=studyAbroad, ?tab=familyCamp)
      → src\components\programs\ProgramsContent.tsx
  - 캠프 프로그램 페이지 (/[lang]/programs/camp, 상시 가족캠프 영역)
      → src\components\programs\CampProgramsContent.tsx
  - 공통 문구: 8개 사전의 programs.detail.localSchool
  - 표시 대상 과정 목록·학교 링크 주소: src\config\programs.ts
  - 정규 과정 페이지(/programs/regular)의 "Local School Experience" 작은 태그(RegularProgramsContent.tsx)는
    학교명이 없어 수정하지 않음

==========================================================================
2. 변경 파일 (C:\Users\asatt\academy 아래 같은 경로에 덮어쓰기)
==========================================================================
  C:\Users\asatt\academy\src\components\programs\ProgramsContent.tsx
    - 학교 홈페이지 링크 버튼 삭제 (+ 쓰지 않게 된 링크 아이콘·주소 import 삭제)
    - 학교명 문장(independenceNote) 표시 삭제 → 안내 문구(conditionNote)만 표시
    - 「현지 학교 경험 상담하기」 버튼은 그대로 (현재 과정 + 관심 경험 localSchool 자동 선택 — 기존 상담 기능 유지)
  C:\Users\asatt\academy\src\components\programs\CampProgramsContent.tsx
    - 위와 같음 (상담 버튼 ConsultButton course="familyCamp" 그대로)
  C:\Users\asatt\academy\src\config\programs.ts
    - 학교 홈페이지 주소 상수(SAGE_PREP_URL) 삭제 — 위 2개 파일 외에 사용하는 곳 없음 확인
    - 주석의 학교명 삭제. 표시 대상 과정(familyCamp, studyAbroad)과 다른 설정은 그대로
  C:\Users\asatt\academy\src\types\dictionary.ts
    - programs.detail.localSchool에서 independenceNote / cta / newTabLabel 삭제
      (남은 항목: label, title, description, conditionNote, consultCta)
    - 홈 LIVE & LEARN 부분(liveLearn.school)은 이전 최종본 그대로
  C:\Users\asatt\academy\src\dictionaries\ko.json, en.json, ja.json, vi.json, zh-TW.json, mn.json, ru.json, ar.json
    - programs.detail.localSchool 블록만 수정 (각 파일 9줄 변경, 다른 항목은 그대로)

  레이아웃: 블록 위치·글자 크기·색·간격 그대로. 버튼이 2개 → 1개(상담 버튼)로 줄어든 것만 다름.

==========================================================================
3. 문구 변경 (programs.detail.localSchool)
==========================================================================
  label("LOCAL SCHOOL EXPERIENCE")와 상담 버튼 문구(consultCta)는 그대로.
  "현지 사립학교 / 학교 측과의 협의를 바탕으로" 표현을 홈 LIVE & LEARN과 같은 "현지 학교 체험" 표현으로 맞췄고,
  참여 가능 여부·일정은 "학생의 연령, 현지 학교와의 협의 및 프로그램 운영 조건"에 따라 상담으로 안내한다는 뜻을 유지했습니다.

  [ko] 제목: 현지 학교 체험 (선택)
       설명: 세부에서 영어를 배우며 현지 학교 환경과 교육 문화를 경험하고, 실제 생활 속에서 영어를 사용할 수 있는 선택 프로그램입니다.
       안내: 실제 참여 가능 여부와 일정은 학생의 연령, 현지 학교와의 협의 및 프로그램 운영 조건에 따라 상담을 통해 안내합니다.
  [en] Local School Experience (Optional)
       An optional program that lets students experience a local school environment and its educational culture while learning English in Cebu, with opportunities to use English in real life.
       Actual availability and schedules depend on the student's age, discussions with the local school, and program operating conditions, and are provided during consultation.
  [ja] 現地学校体験（選択） / セブで英語を学びながら、現地の学校環境や教育文化を体験し、実際の生活の中で英語を使うことができる選択プログラムです。
       / 実際の参加可否や日程は、生徒の年齢、現地学校との協議およびプログラムの運営条件に応じて、ご相談の際にご案内します。
  [vi] Trải nghiệm trường học địa phương (tùy chọn) / Chương trình tùy chọn giúp học viên vừa học tiếng Anh tại Cebu vừa trải nghiệm môi trường học đường và văn hóa giáo dục địa phương, đồng thời sử dụng tiếng Anh trong cuộc sống thực tế.
       / Khả năng tham gia thực tế và lịch trình tùy theo độ tuổi của học viên, trao đổi với trường học địa phương và điều kiện vận hành chương trình, và sẽ được thông báo khi tư vấn.
  [zh-TW] 當地學校體驗（選修） / 在宿霧學習英語的同時，體驗當地學校環境與教育文化，並在實際生活中使用英語的選修課程。
       / 實際能否參與及日程，將依學生年齡、與當地學校的協商及課程營運條件，於諮詢時說明。
  [mn] Орон нутгийн сургуулийн туршлага (сонголтот) / Себу хотод англи хэл сурахын зэрэгцээ орон нутгийн сургуулийн орчин, боловсролын соёлтой танилцаж, бодит амьдралд англи хэлийг ашиглах сонголтот хөтөлбөр юм.
       / Бодитоор оролцох боломж болон хуваарийг сурагчийн нас, орон нутгийн сургуультай хийх зөвшилцөл, хөтөлбөрийн зохион байгуулалтын нөхцөлөөс хамааран зөвлөгөөний үеэр мэдэгдэнэ.
  [ru] Опыт местной школы (по желанию) / Дополнительная программа, которая во время изучения английского на Себу позволяет познакомиться со средой и образовательной культурой местной школы и использовать английский в реальной жизни.
       / Возможность участия и сроки зависят от возраста ученика, согласования с местной школой и условий проведения программы и сообщаются на консультации.
  [ar] تجربة المدرسة المحلية (اختيارية) / برنامج اختياري يتيح للطلاب، أثناء تعلّم الإنجليزية في سيبو، تجربة البيئة المدرسية المحلية وثقافتها التعليمية واستخدام الإنجليزية في الحياة الواقعية.
       / تعتمد إمكانية المشاركة الفعلية ومواعيدها على عمر الطالب والتنسيق مع المدرسة المحلية وشروط تشغيل البرنامج، ونوضّحها خلال الاستشارة.
  ※ ko 외 7개 언어는 번역문입니다. 원어민 확인을 권장합니다.

==========================================================================
4. 검사 구분
==========================================================================
  [실행 성공]
    - 학교명·주소 검색 (SAGE PREP / SCHOOLHOUSE / sageprepschoolhouse): src·scripts 전체 0건
      (홈 LIVE & LEARN, 프로그램 상세 모두. 생성된 Prisma 파일 제외)
    - 학교 링크·아이콘·삭제 항목(SAGE_PREP_URL, ArrowUpRight, independenceNote, newTabLabel, localSchool.cta) 참조 0건
    - 8개 언어 programs.detail.localSchool 항목 5개 일치, 빈 값 없음
    - 프로그램 문구·홈 LIVE & LEARN 문구에 제휴·파트너·공식 관련 단어 없음 (8개 언어 키워드 검사)
    - 수정한 TS/TSX 4개 파일 TypeScript 구문 검사 (transpile — 타입 검사 아님): 오류 0
    - 직전 상태 대비 변경 파일이 위 2.의 목록뿐임, class_1.jpeg 원본과 동일
  [환경 제약으로 미실행]
    - npx tsc --noEmit, npm.cmd run build — 작업 환경에서 npm 패키지 저장소 접속이 조직 네트워크 정책으로
      차단되어 의존 패키지를 설치할 수 없음 (재시도하지 않음)
  [미확인]
    - 브라우저 확인을 하지 못했습니다. PC에서 아래 화면을 확인해 주세요.
      /ko/programs?tab=studyAbroad, /ko/programs?tab=familyCamp, /ko/programs/camp (+ /en, /ar)
      - 「현지 학교 경험 상담하기」 클릭 시 상담 창에 해당 과정·「현지 학교 경험」이 미리 선택되는지

==========================================================================
5. 참고 (이번 범위 밖, 수정하지 않음)
==========================================================================
  - 홈 LIVE & LEARN의 경험 포인트 항목(liveLearn.points) 중 하나에 학교명은 없지만
    "현지 사립학교를 직접 경험하다 / 학교 측과의 협의를 바탕으로…" 문구가 있습니다(8개 언어).
    현지 학교 체험 블록과 표현을 맞추려면 별도로 요청해 주세요.
