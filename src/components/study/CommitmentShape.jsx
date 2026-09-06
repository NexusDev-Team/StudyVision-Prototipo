// Marcador padronizado de tipo de compromisso. Todas as formas partilham a
// mesma caixa óptica (12×12) e a mesma espessura de traço, para não ficarem
// com pesos visuais diferentes: prova ● / trabalho ▲ / entrega ✕ / outro ✱.
export default function CommitmentShape({ type, size = 9, color = "currentColor" }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 12 12",
    "aria-hidden": true,
    style: { display: "block", flexShrink: 0 },
  };
  const line = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round", fill: "none" };

  switch (type) {
    case "exam":
      return (
        <svg {...props}>
          <circle cx="6" cy="6" r="4" fill={color} />
        </svg>
      );
    case "assignment":
      return (
        <svg {...props}>
          <path d="M6 1 L10.3 9.3 L1.7 9.3 Z" fill={color} />
        </svg>
      );
    case "deadline":
      return (
        <svg {...props}>
          <path d="M2.6 2.6 L9.4 9.4 M9.4 2.6 L2.6 9.4" {...line} />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M6 1.8 V10.2 M2.36 3.9 L9.64 8.1 M2.36 8.1 L9.64 3.9" {...line} />
        </svg>
      );
  }
}
