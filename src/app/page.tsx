import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Amanah
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600">
            A simple place to report lost or found items and help them get back
            to their owners.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/report/lost"
            className="inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-5 py-3 text-base font-medium text-white sm:w-auto"
          >
            Report a lost item
          </Link>
          <Link
            href="/report/found"
            className="inline-flex w-full items-center justify-center rounded-lg border border-teal-700 px-5 py-3 text-base font-medium text-teal-800 sm:w-auto"
          >
            Report a found item
          </Link>
        </div>
      </div>
    </main>
  );
}
