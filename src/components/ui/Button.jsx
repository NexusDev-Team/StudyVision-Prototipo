import { motion } from "framer-motion";

const BASE = "flex cursor-pointer items-center justify-center gap-2 border-none font-sans disabled:cursor-default";
const VARIANTS = {
  primary: "bg-sv-grad-primary text-white rounded-sv-lg shadow-sv-btn text-[15px] font-bold",
  outline: "bg-white border-[1.5px] border-solid border-sv-line rounded-sv-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] text-[13px] font-bold",
  ghost: "bg-transparent",
};

// variant: "primary" (gradient CTA) | "outline" (white bordered) | "ghost" (bare)
export default function Button({
  variant = "primary", children, style, onClick, disabled, whileTap = { scale: 0.95 },
  ...rest
}) {
  return (
    <motion.button
      whileTap={whileTap}
      onClick={onClick}
      disabled={disabled}
      className={`${BASE} ${VARIANTS[variant]}`}
      style={style}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
