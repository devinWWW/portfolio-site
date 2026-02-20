export default function HomePage() {
  return (
    <div className="space-y-10 text-[1.02rem] leading-8 text-zinc-700 dark:text-zinc-300 md:text-[1.08rem]">
      <section className="space-y-9">
        <p className="m-0 text-[1.2rem] font-medium leading-[1.52] text-zinc-900 dark:text-zinc-100 md:text-[1.35rem]">
          Hey, I&apos;m Devin! I&apos;m a software engineer currently trying to build the future of web
          automations with browser agents.
        </p>

        <p className="m-0">
          I love working on products to make them seamless for users and making people&apos;s lives
          better via software.
        </p>

        <p className="m-0">
          My day-to-day work mostly spans frontend development and product engineering. However,
          I&apos;m comfortable working around the stack!
        </p>
      </section>

      <section className="space-y-7 pt-2">
        <h2 className="m-0 text-[1.7rem] font-semibold text-zinc-900 dark:text-zinc-100 md:text-[1.85rem]">
          Current
        </h2>

        <p className="m-0">
          Growth Engineer at{' '}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Your Company</span>,
          shipping daily and helping identify friction points for users.
        </p>

        <p className="m-0">
          Building side projects focused on automation, AI workflows, and thoughtful web
          experiences.
        </p>
      </section>
    </div>
  )
}
