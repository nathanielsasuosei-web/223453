import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mesh grain relative grid min-h-[70vh] place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 animate-blob bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 animate-blob bg-brand-2/15 blur-3xl" />
      <div className="relative text-center">
        <p className="font-mono text-6xl font-black text-gradient sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">This track got lost in the vault</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          The page you're looking for doesn't exist — but the beat catalog is still one click away.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/beats" className="btn btn-primary">
            Browse beats
          </Link>
          <Link href="/" className="btn btn-ghost">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
