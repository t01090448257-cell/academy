// 아직 기능을 구현하지 않은 관리자 페이지용 준비중 화면

interface AdminComingSoonProps {
  title: string;
  caption: string;
  description: string;
}

export default function AdminComingSoon({ title, caption, description }: AdminComingSoonProps) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{caption}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>

      <div className="mt-6 rounded-2xl bg-white p-8 shadow sm:p-12">
        <div className="mx-auto max-w-md text-center">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            준비중
          </span>
          <p className="mt-4 text-lg font-semibold text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
    </section>
  );
}
