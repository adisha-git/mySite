/** Fixed facts, rendered exactly as the server sent them from facts.ts. */
export function FactCard({
  facts,
}: {
  facts: readonly { id: string; label: string; text: string }[];
}) {
  if (!facts.length) return null;
  return (
    <div className="border-accent/40 rounded-lg border px-3 py-2.5">
      <p className="text-accent-text mb-1.5 font-mono text-[11px]">{"// key facts"}</p>
      <dl className="space-y-2">
        {facts.map((fact) => (
          <div key={fact.id}>
            <dt className="text-muted text-xs">{fact.label}</dt>
            <dd className="text-ink text-[15px] leading-relaxed">{fact.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
