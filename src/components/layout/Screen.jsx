// Shell shared by every non-fullscreen-media screen: column layout, hidden overflow.
// `background` overrides the default light background for dark screens (Vision+).
export default function Screen({ background, children }) {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-sv-bg font-sans"
      style={background ? { background } : undefined}
    >
      {children}
    </div>
  );
}
