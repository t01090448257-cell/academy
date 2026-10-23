// src/types/dictionary.ts
// src/dictionaries/*.json 이 반드시 따라야 하는 스키마.
// 새 키를 추가할 때는 이 타입을 먼저 갱신하고, 7개 json 파일 전부에 동일한 키를 추가할 것.

export interface Dictionary {
  meta: {
    /** 브랜드 축약명 (전 언어 공통, 번역하지 않음) */
    siteName: "SYA";
    /** 브랜드 풀네임 (전 언어 공통, 번역하지 않음) */
    siteNameFull: "Special Your Academy";
  };
  /** GNB 6대 대메뉴 */
  nav: {
    about: string;
    programs: string;
    campus: string;
    services: string;
    admission: string;
    community: string;
  };
  /** 메인 히어로 슬로건 + CTA 버튼 */
  hero: {
    sloganMain: string;
    sloganSub: string;
    ctaCalculator: string;
    ctaConsult: string;
  };
  /** 언어 선택 드롭다운 관련 UI 문자열 */
  langSwitcher: {
    label: string;
  };
  /** 메인 랜딩 - SYA 핵심 경쟁력 3대장 섹션 */
  whySya: {
    title: string;
    subtitle: string;
    items: {
      mentoring: { title: string; description: string };
      global: { title: string; description: string };
      campus: { title: string; description: string };
    };
  };
  /** 메인 랜딩 - 코스 그리드 섹션 */
  programs: {
    title: string;
    subtitle: string;
    items: {
      esl: { title: string; description: string };
      examPrep: { title: string; description: string };
      business: { title: string; description: string };
      junior: { title: string; description: string };
    };
  };
}
