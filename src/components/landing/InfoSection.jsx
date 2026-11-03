// Seção com título, texto e imagem; `reverse` inverte a ordem no desktop.
export default function InfoSection({ id, title, image, imageAlt, reverse = false, children }) {
  return (
    <section id={id} className="mx-auto flex w-full max-w-6xl flex-col justify-center px-5 py-6 md:py-10 min-h-[calc(100dvh-4.25rem)] scroll-mt-[4.25rem]">
      <h2 className="mb-5 text-center md:mb-8 text-3xl font-extrabold text-white md:text-4xl">{title}</h2>
      <div className={`grid items-center gap-8 md:grid-cols-2 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
        <div className="rounded-2xl border border-lp-line bg-lp-bg2 p-6 text-base leading-relaxed text-lp-text md:p-8">
          {children}
        </div>
        <img src={image} alt={imageAlt} className="mx-auto max-h-[28dvh] w-full rounded-2xl object-contain md:max-h-[55dvh]" loading="lazy" />
      </div>
    </section>
  );
}
