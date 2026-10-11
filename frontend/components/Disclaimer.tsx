/** Reminds users that generated documents are drafts that need a lawyer's review. */
export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`rounded border-l-4 border-accent bg-accent/10 px-4 py-3 text-sm text-navy ${className}`}>
      <strong>Draft only.</strong> Documents from Prelegal are drafts. Have a qualified lawyer review them before anyone
      signs. Prelegal is not a law firm, and this is not legal advice.
    </p>
  );
}
