import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="notice" role="alert">
      <h2 className="notice__title">Page not found</h2>
      <p>The page you asked for does not exist.</p>
      <Link className="button button--primary" href="/">
        Back to your tasks
      </Link>
    </section>
  );
}
