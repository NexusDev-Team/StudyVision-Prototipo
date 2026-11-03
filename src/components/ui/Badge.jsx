// Generic pill used for concepts, keywords and status tags. Every variant in
// the app differs only by color/background/size, so those are passed as props
// (valores dinâmicos por chamada, por isso inline) sobre a base em Tailwind.
export default function Badge({
  children, color = "#64748B", background = "#F1F5F9",
  fontSize = 12, fontWeight = 600, padding = "4px 12px", radius, style,
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[20px] font-sans whitespace-nowrap"
      style={{ color, background, fontSize, fontWeight, padding, borderRadius: radius, ...style }}
    >
      {children}
    </span>
  );
}
