const INPUT =
  "w-full rounded-xl border bg-lp-bg px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-lp-muted focus:border-lp-blue-light";

export default function AuthField({ label, name, error, ...props }) {
  return (
    <label className="block text-left text-sm font-semibold text-lp-text">
      {label}
      <input
        name={name}
        aria-invalid={!!error}
        className={`${INPUT} mt-1.5 ${error ? "border-red-400" : "border-lp-line"}`}
        {...props}
      />
      {error && <span role="alert" className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
