type WipPageProps = {
  title: string
}

export default function WipPage({ title }: WipPageProps) {
  return (
    <section className="min-h-[52vh] space-y-6">
      <h2 className="m-0 text-[1.7rem] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-[1.9rem]">
        {title}
      </h2>
      <p className="m-0 text-[0.98rem] leading-7 text-zinc-700 dark:text-zinc-300">
        This page is a work in progress. Content coming soon.
      </p>
    </section>
  )
}
