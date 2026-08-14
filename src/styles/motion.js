export const slideIn = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 380, damping: 32 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};

export const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 28 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};
