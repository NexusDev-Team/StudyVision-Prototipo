import styles from "./Badge.module.css";

// Generic pill used for concepts, keywords and status tags. Every variant in
// the app differs only by color/background/size, so those are passed as props
// rather than baked into CSS classes.
export default function Badge({
  children, color = "#64748B", background = "#F1F5F9",
  fontSize = 12, fontWeight = 600, padding = "4px 12px", radius, style,
}) {
  return (
    <span
      className={styles.badge}
      style={{ color, background, fontSize, fontWeight, padding, borderRadius: radius, ...style }}
    >
      {children}
    </span>
  );
}
