import Bar from '../../components/Bar'
import { content } from '../../data/content'

export default function CommunityPage() {
  const { community: text, impact } = content

  return (
    <>
      <header className="page__head">
        <p className="page__eyebrow">{text.eyebrow}</p>
        <h1 className="page__title">{text.title}</h1>
      </header>

      <div className="impact">
        <div className="impact__goal">
          <p className="impact__seeds">{impact.seeds}</p>
          <Bar value={impact.progress} label={impact.progressLabel} tone="inverse" />
          <p className="impact__remain">{impact.seedsRemain}</p>
          <p className="impact__hint">{impact.seedsHint}</p>
        </div>
        <div className="impact__stats">
          {impact.stats.map((stat) => (
            <div key={stat.label} className="card stat">
              <strong className={stat.accent ? 'is-accent' : undefined}>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="note">{impact.badge}</p>
    </>
  )
}
