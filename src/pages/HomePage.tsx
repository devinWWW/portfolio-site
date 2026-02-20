export default function HomePage() {
  return (
    <div className="space-y-10 text-[1.02rem] leading-8 text-zinc-700 dark:text-zinc-300 md:text-[1.08rem]">
      <section className="space-y-9">
        <p className="m-0 text-[1.2rem] font-medium leading-[1.52] text-zinc-900 dark:text-zinc-100 md:text-[1.35rem]">
          Hey, I&apos;m Devin! I&apos;m a builder focused on software, automation, and real-world business
          growth.
        </p>

        <p className="m-0">
          I work at the intersection of product, engineering, and operations, where I build tools
          and systems that solve practical problems, especially for businesses. A lot of my work
          blends frontend development, automation, analytics, and hands-on execution.
        </p>

        <p className="m-0">
          My day-to-day spans frontend/product engineering, finance automation, and technical
          problem-solving across the stack. I&apos;m especially interested in AI workflows, web
          automation, and building software that creates leverage.
        </p>
      </section>

      <section className="space-y-7 pt-2">
        <h2 className="m-0 text-[1.7rem] font-semibold text-zinc-900 dark:text-zinc-100 md:text-[1.85rem]">
          Current
        </h2>

        <p className="m-0">
          Running growth + systems work across brands (marketing, automation,
          analytics, and operations) while continuing to build side projects in AI, trading tools,
          and web products.
        </p>

        <p className="m-0">
          Building side projects in AI, trading tools, and web products focused on automation, AI
          agents/workflows, and high-utility web experiences.
        </p>
      </section>

      <section className="pt-1">
        <ul className="flex w-full flex-wrap items-center justify-start gap-3 px-0 text-[0.92rem] leading-none text-zinc-500 dark:text-zinc-400 md:gap-4">
          <li>
            <a
              className="mystery-nav-link is-idle-dark is-idle-light whitespace-nowrap transition-colors duration-400 ease-out"
              href="https://github.com/devinWWW"
              rel="noreferrer"
              target="_blank"
            >
              github
            </a>
          </li>
          <li>
            <a
              className="mystery-nav-link is-idle-dark is-idle-light whitespace-nowrap transition-colors duration-400 ease-out"
              href="https://www.linkedin.com/in/devin-g-widmer"
              rel="noreferrer"
              target="_blank"
            >
              linkedin
            </a>
          </li>
          <li>
            <a
              className="mystery-nav-link is-idle-dark is-idle-light whitespace-nowrap transition-colors duration-400 ease-out"
              href="mailto:devinwidmer2022@gmail.com"
            >
              email
            </a>
          </li>
        </ul>
      </section>
    </div>
  )
}
