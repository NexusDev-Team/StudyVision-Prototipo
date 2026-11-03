// `message` cobre o caso simples (uma linha); `title` + `description` cobrem
// o caso de estado vazio "de verdade" (ex: biblioteca sem nenhum conteúdo),
// com um título em destaque e uma explicação do que fazer a seguir.
export default function EmptyState({ icon, title, description, message, paddingTop = 60 }) {
  return (
    <div className="text-center font-sans text-sv-faint" style={{ paddingTop }}>
      {icon}
      {title ? (
        <>
          <p className="m-0 mb-1 text-sm font-bold text-slate-600">{title}</p>
          {description && <p className="m-0 text-[13px]">{description}</p>}
        </>
      ) : (
        <p className="m-0 text-[13px]">{message}</p>
      )}
    </div>
  );
}
