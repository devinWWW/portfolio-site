export default function ContactPage() {
  return (
    <section className="min-h-[52vh] space-y-6">
      <h2 className="m-0 text-[1.7rem] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-[1.9rem]">
        Get in touch
      </h2>

      <p className="m-0 text-[0.98rem] leading-7 text-zinc-700 dark:text-zinc-300">
        Interested in working together, discussing a project, or talking tech? I&apos;d love to hear
        from you.
      </p>

      <p className="m-0 text-[0.98rem] leading-7 text-zinc-700 dark:text-zinc-300">
        Email: <span className="text-zinc-900 dark:text-zinc-100">devinwidmer2022@gmail.com</span>
      </p>

      <p className="m-0 text-[0.98rem] leading-7 text-zinc-700 dark:text-zinc-300">
        GitHub:{' '}
        <a
          className="font-medium text-zinc-900 underline underline-offset-2 transition-colors duration-400 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          href="https://github.com/devinWWW"
          rel="noreferrer"
          target="_blank"
        >
          @devinWWW
        </a>
      </p>

      <p className="m-0 text-[0.98rem] leading-7 text-zinc-700 dark:text-zinc-300">
        LinkedIn:{' '}
        <a
          className="font-medium text-zinc-900 underline underline-offset-2 transition-colors duration-400 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          href="https://www.linkedin.com/in/devin-g-widmer"
          rel="noreferrer"
          target="_blank"
        >
          /in/devin-g-widmer
        </a>
      </p>

      <p className="m-0 text-[0.98rem] leading-7 text-zinc-700 dark:text-zinc-300">
        Feel free to email or connect with me on the platforms listed above!
      </p>
    </section>
  )
}
