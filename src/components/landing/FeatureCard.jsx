export default function FeatureCard({ title, text, index }) {
  return (
    <article className="rounded-2xl border border-lp-line bg-lp-bg2 p-5">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-lp-blue/20 text-sm font-extrabold text-lp-cyan">
        {index + 1}
      </span>
      <h3 className="m-0 mb-1.5 text-lg font-bold text-white">{title}</h3>
      <p className="m-0 text-sm leading-relaxed text-lp-muted">{text}</p>
    </article>
  );
}
