export default function TeamCard({ name, role, photo }) {
  return (
    <article className="flex flex-col items-center rounded-2xl border border-lp-line bg-lp-bg2 p-5 text-center">
      <img
        src={photo}
        alt={`Foto de ${name}`}
        className="mb-4 h-28 w-28 rounded-full border-2 border-lp-blue object-cover"
        loading="lazy"
      />
      <p className="m-0 font-bold text-white">{name}</p>
      <p className="m-0 mt-1 text-sm text-lp-muted">{role}</p>
    </article>
  );
}
