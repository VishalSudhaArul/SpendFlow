import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState.jsx';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-xl brand-gradient px-4 text-sm font-semibold text-white"
          >
            Back to SpendFlow
          </Link>
        }
      />
    </div>
  );
}
