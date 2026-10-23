import Image from "next/image";
import type { Dictionary } from "@/types/dictionary";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";

interface AccommodationSectionProps {
  dict: Dictionary;
}

/**
 * BE Pods Lahug 실제 사진 (원본 파일 그대로 사용, 표시할 때만 object-fit/position 조정)
 * - 대형 원본(4000×3000, 4:3): 대표 이미지로 크게 사용
 * - 소형 원본(약 425×280): 원래 크기 이하로만 작게 사용 (확대 금지)
 */
const PHOTOS = {
  lobby: "/images/be-pods/lobby-lounge-web.jpg",
  twinRoom: "/images/be-pods/twin-room-web.jpg",
  pool: "/images/be-pods/pool-web.jpg",
  gym: "/images/be-pods/gym.png",
  laundry: "/images/be-pods/laundry.png",
  poolLifestyle: "/images/be-pods/pool-lifestyle.png",
  poolCourtyard: "/images/be-pods/pool-courtyard.png",
  bedroom: "/images/be-pods/bedroom.png",
} as const;

/** 소형 원본을 원래 폭 이상으로 늘리지 않기 위한 최대 표시 폭 */
const SMALL_PHOTO_MAX = "max-w-[426px]";

function Eyebrow({ index, children }: { index: string; children: string }) {
  return (
    <p lang="en" className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep">
      <span aria-hidden="true" className="tabular-nums">{index}</span>
      <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
      <span>{children}</span>
    </p>
  );
}

function Caption({ children }: { children: string }) {
  return (
    <figcaption lang="en" className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-sya-ink/45">
      {children}
    </figcaption>
  );
}

export default function AccommodationSection({ dict }: AccommodationSectionProps) {
  const a = dict.accommodation;

  return (
    <>
      <section id="accommodation" aria-labelledby="accommodation-heading" className="border-t border-sya-ink/6 bg-white">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          {/* ── 생활 챕터 라벨: 숙소(01)부터 시설·생활(03~05)까지를 하나의 챕터로 묶음 ── */}
          <p
            lang="en"
            className="mb-12 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.34em] text-sya-navy/45 lg:mb-16"
          >
            <span className="shrink-0">{a.chapterLabel}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-sya-ink/10" />
          </p>

          {/* ── 01 ACCOMMODATION: 로비 라운지 대표 이미지 ── */}
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
            <div className="lg:col-span-4 lg:pb-4">
              <Eyebrow index="01">{a.eyebrow}</Eyebrow>
              <h2 id="accommodation-heading" className="mt-6 text-4xl font-bold tracking-tight text-sya-navy sm:text-5xl">
                {a.title}
              </h2>
              <p className="mt-5 break-keep text-xl font-light leading-snug text-sya-navy/80 sm:text-2xl lg:whitespace-pre-line">
                {a.subtitle}
              </p>
              <p className="mt-6 max-w-md break-keep text-sm leading-relaxed text-sya-ink/60 sm:text-[15px] lg:whitespace-pre-line">
                {a.description}
              </p>
            </div>
            <figure className="lg:col-span-8">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sya-soft">
                <Image
                  src={PHOTOS.lobby}
                  alt={a.lobby.alt}
                  fill
                  sizes="(min-width: 1280px) 820px, (min-width: 1024px) 66vw, 100vw"
                  className="object-cover object-[45%_center]"
                />
              </div>
              <Caption>{a.lobby.caption}</Caption>
            </figure>
          </div>

          {/* ── 02 COMFORTABLE STAY: 트윈룸 ── */}
          <div className="mt-24 grid gap-10 lg:mt-32 lg:grid-cols-12 lg:items-center lg:gap-16">
            <figure className="lg:col-span-7">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sya-soft">
                <Image
                  src={PHOTOS.twinRoom}
                  alt={a.stay.photo.alt}
                  fill
                  sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
                  className="object-cover object-[60%_center]"
                />
              </div>
              <Caption>{a.stay.photo.caption}</Caption>
            </figure>
            <div className="lg:col-span-4 lg:col-start-9">
              <Eyebrow index="02">{a.stay.eyebrow}</Eyebrow>
              <h3 className="mt-6 break-keep text-2xl font-bold leading-snug tracking-tight text-sya-navy sm:text-3xl lg:whitespace-pre-line">
                {a.stay.title}
              </h3>
              <p className="mt-5 break-keep text-sm leading-relaxed text-sya-ink/60 sm:text-[15px] lg:whitespace-pre-line">
                {a.stay.description}
              </p>
            </div>
          </div>

          {/* ── 03 RESORT-STYLE FACILITIES: 수영장 와이드 ── */}
          <div className="mt-24 lg:mt-32">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
              <div className="lg:col-span-6">
                <Eyebrow index="03">{a.facilities.eyebrow}</Eyebrow>
                <h3 className="mt-6 break-keep text-2xl font-bold leading-snug tracking-tight text-sya-navy sm:text-3xl lg:whitespace-pre-line">
                  {a.facilities.title}
                </h3>
              </div>
              <p className="break-keep text-sm leading-relaxed text-sya-ink/60 sm:text-[15px] lg:col-span-4 lg:col-start-9">
                {a.facilities.description}
              </p>
            </div>
            <figure className="mt-10">
              {/* 모바일은 원본 비율(4:3), 태블릿 이상은 와이드. 수영장·선베드가 중심에 오도록 위치 조정 */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sya-soft sm:aspect-[16/9]">
                <Image
                  src={PHOTOS.pool}
                  alt={a.facilities.photo.alt}
                  fill
                  sizes="(min-width: 1280px) 1216px, 100vw"
                  className="object-cover object-[50%_60%]"
                />
              </div>
              <Caption>{a.facilities.photo.caption}</Caption>
            </figure>
          </div>

          {/* ── 04 EVERYDAY CONVENIENCE: 피트니스 / 세탁 (소형 원본 → 작게, 높이를 엇갈리게) ── */}
          <div className="mt-24 grid gap-12 sm:grid-cols-2 lg:mt-32 lg:grid-cols-12 lg:gap-10">
            <div className="sm:col-span-2 lg:col-span-4">
              <Eyebrow index="04">{a.convenience.eyebrow}</Eyebrow>
              <h3 className="mt-6 break-keep text-2xl font-bold leading-snug tracking-tight text-sya-navy sm:text-3xl lg:whitespace-pre-line">
                {a.convenience.title}
              </h3>
              <p className="mt-5 max-w-md break-keep text-sm leading-relaxed text-sya-ink/60 sm:text-[15px]">
                {a.convenience.description}
              </p>
            </div>
            {(
              [
                { key: "gym", src: PHOTOS.gym, item: a.convenience.gym, ratio: "aspect-[426/287]", offset: "" },
                { key: "laundry", src: PHOTOS.laundry, item: a.convenience.laundry, ratio: "aspect-[425/270]", offset: "lg:mt-24" },
              ] as const
            ).map(({ key, src, item, ratio, offset }) => (
              <figure key={key} className={`lg:col-span-4 ${offset}`}>
                <div className={`relative w-full ${SMALL_PHOTO_MAX} ${ratio} overflow-hidden rounded-lg bg-sya-soft`}>
                  <Image src={src} alt={item.alt} fill sizes="426px" className="object-cover" />
                </div>
                <figcaption className={`mt-4 ${SMALL_PHOTO_MAX}`}>
                  <span lang="en" className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-sya-gold-deep">
                    {item.caption}
                  </span>
                  <span className="mt-2 block break-keep text-sm leading-relaxed text-sya-ink/65">{item.text}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* ── 05 LIFESTYLE GALLERY (소형 원본 3장, 점프 사진은 보조로 마지막) ── */}
          <div className="mt-24 lg:mt-32">
            <Eyebrow index="05">{a.gallery.eyebrow}</Eyebrow>
            <h3 className="mt-6 break-keep text-2xl font-bold tracking-tight text-sya-navy sm:text-3xl">
              {a.gallery.title}
            </h3>
            <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {(
                [
                  { key: "poolCourtyard", src: PHOTOS.poolCourtyard, item: a.gallery.poolCourtyard, ratio: "aspect-[421/284]", position: "object-center" },
                  { key: "bedroom", src: PHOTOS.bedroom, item: a.gallery.bedroom, ratio: "aspect-[421/283]", position: "object-center" },
                  { key: "poolLifestyle", src: PHOTOS.poolLifestyle, item: a.gallery.poolLifestyle, ratio: "aspect-[426/279]", position: "object-[50%_35%]" },
                ] as const
              ).map(({ key, src, item, ratio, position }) => (
                <li key={key}>
                  <figure className={SMALL_PHOTO_MAX}>
                    <div className={`relative w-full ${ratio} overflow-hidden rounded-lg bg-sya-soft`}>
                      <Image src={src} alt={item.alt} fill sizes="426px" className={`object-cover ${position}`} />
                    </div>
                    <Caption>{item.caption}</Caption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>

          {/* ── ADDITIONAL ACCOMMODATION: Noble Hotel (Priority 2, 간결하게) ── */}
          <aside
            aria-label={a.additional.eyebrow}
            className="mt-16 flex flex-col gap-3 border-t border-sya-ink/10 pt-8 sm:flex-row sm:items-baseline sm:gap-10"
          >
            <p lang="en" className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.26em] text-sya-ink/45">
              {a.additional.eyebrow}
            </p>
            <p className="break-keep text-sm text-sya-ink/65">
              <span className="font-semibold text-sya-navy">{a.additional.name}</span>
              <span aria-hidden="true" className="mx-3 text-sya-gold">·</span>
              {a.additional.description}
            </p>
          </aside>
        </div>
      </section>

      {/* ── 06 CLOSING: 수영장 대형 배경 + 왼쪽에만 네이비 그라데이션 ── */}
      <section aria-labelledby="accommodation-closing-heading" className="relative isolate overflow-hidden bg-sya-navy text-white">
        <div className="absolute inset-0 -z-10">
          <Image
            src={PHOTOS.pool}
            alt={a.closing.imageAlt}
            fill
            sizes="100vw"
            className="object-cover object-[50%_55%] saturate-[0.9]"
          />
          <div className="absolute inset-0 bg-sya-navy/70 lg:hidden" />
          {/* ar(RTL)에서는 텍스트가 오른쪽에 오므로 그라데이션 방향만 반대로 (사진은 반전하지 않음) */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-sya-navy/92 from-10% via-sya-navy/60 via-45% to-transparent to-80% rtl:bg-gradient-to-l lg:block" />
        </div>
        <div className="mx-auto flex min-h-[460px] max-w-7xl items-center px-6 py-20 sm:px-8 lg:min-h-[560px]">
          <div className="max-w-xl">
            <p lang="en" className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold">
              <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
              {a.closing.eyebrow}
            </p>
            <h3
              id="accommodation-closing-heading"
              className="mt-6 break-keep text-3xl font-bold leading-snug tracking-tight sm:text-4xl lg:whitespace-pre-line"
            >
              {a.closing.title}
            </h3>
            <p className="mt-6 break-keep text-sm leading-relaxed text-white/75 sm:text-base lg:whitespace-pre-line">
              {a.closing.description}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
