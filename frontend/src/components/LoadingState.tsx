// Skeleton placeholder shown while the notes list is loading.
// Matches the approximate shape of NoteCard to avoid layout shift.
export default function LoadingState() {
  return (
    <div className="p-3 space-y-2" aria-label="Loading notes" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-bg-surface">
          <div className="skeleton h-4 w-3/4 mb-2" />
          <div className="skeleton h-3 w-full mb-1" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
