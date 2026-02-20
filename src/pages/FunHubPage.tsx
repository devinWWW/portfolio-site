import { useNavigate } from 'react-router-dom'

type FunItem = {
  title: string
  description: string
  path: string
  icon: 'square' | 'coin'
}

const funItems: FunItem[] = [
  {
    title: 'Geometry Trash',
    description: 'A chaotic runner game.',
    path: '/fun/geometry-trash',
    icon: 'square',
  },
  {
    title: 'Memecoin Futures Simulator',
    description: 'Start with $1,000 and long/short a volatile market cap chart.',
    path: '/fun/memecoin-simulator',
    icon: 'coin',
  },
]

type FunCardProps = {
  title: string
  description: string
  icon: 'square' | 'coin'
  onOpen: () => void
}

function FunCard({ title, description, icon, onOpen }: FunCardProps) {
  return (
    <div
      aria-label={`Open ${title}`}
      className="fun-card group"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      role="link"
      tabIndex={0}
    >
      <article className="grid h-full grid-rows-[auto_auto_1fr_auto]">
        <div className="fun-card-icon-wrap">
          {icon === 'coin' ? (
            <svg aria-hidden="true" className="h-4 w-4 text-zinc-700 dark:text-zinc-200" fill="none" viewBox="0 0 24 24">
              <path
                d="M4 16l5-5 4 4 7-7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M16 8h4v4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <span className="fun-card-icon" />
          )}
        </div>

        <h3 className="fun-card-title">{title}</h3>

        <p className="fun-card-description">{description}</p>

        <span className="fun-card-play">
          Play
          <span aria-hidden="true">→</span>
        </span>
      </article>
    </div>
  )
}

export default function FunHubPage() {
  const navigate = useNavigate()

  return (
    <section className="min-h-[52vh] space-y-8">
      <h2 className="m-0 text-[1.7rem] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-[1.9rem]">
        Fun
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {funItems.map((item) => (
          <FunCard
            description={item.description}
            icon={item.icon}
            key={item.path}
            onOpen={() => navigate(item.path)}
            title={item.title}
          />
        ))}
      </div>
    </section>
  )
}
