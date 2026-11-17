import { Skeleton } from './Skeleton.jsx';

/** Shown while a page's code chunk loads (usually a split second). */
export function PageLoader() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <Skeleton className="h-6 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
