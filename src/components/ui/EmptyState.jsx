import styles from "./EmptyState.module.css";

// `message` cobre o caso simples (uma linha); `title` + `description` cobrem
// o caso de estado vazio "de verdade" (ex: biblioteca sem nenhum conteúdo),
// com um título em destaque e uma explicação do que fazer a seguir.
export default function EmptyState({ icon, title, description, message, paddingTop = 60 }) {
  return (
    <div className={styles.wrap} style={{ paddingTop }}>
      {icon}
      {title ? (
        <>
          <p className={styles.title}>{title}</p>
          {description && <p className={styles.text}>{description}</p>}
        </>
      ) : (
        <p className={styles.text}>{message}</p>
      )}
    </div>
  );
}
