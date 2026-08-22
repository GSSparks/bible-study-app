/** Deliberately plain and honest rather than a fake "preview" of
 * functionality that doesn't exist yet — sets the right expectation
 * for what's actually built versus what's coming, as this shell fills
 * in over time. */
export default function PlaceholderView({ title, description }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-2 font-display text-2xl text-parchment">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      <p className="mt-6 text-xs uppercase tracking-wide text-brass">Coming soon</p>
    </div>
  );
}