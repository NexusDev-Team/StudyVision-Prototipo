// Seção com título, texto e imagem; `reverse` inverte a ordem no desktop.
export default function InfoSection({ id, title, image, imageAlt, reverse = false, children }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14">
      <h2 className="mb-8 text-center text-3xl font-extrabold text-white md:text-4xl">{title}</h2>
      <div className={`grid items-center gap-8 md:grid-cols-2 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
        <div className="rounded-2xl border border-lp-line bg-lp-bg2 p-6 text-base leading-relaxed text-lp-text md:p-8">
          {children}
        </div>
        <img src={image} alt={imageAlt} className="w-full rounded-2xl object-contain" loading="lazy" />
      </div>
    </section>
  );
}
