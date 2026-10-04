import { Link } from 'react-router-dom';
import { EmptyState, btn } from '../components/ui';

export default function NotFound() {
  return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Page not found" body="That page doesn't exist. Head back to the workshop page." action={<Link to="/" className={btn.primary}>Go to the workshop</Link>} /></div>;
}
