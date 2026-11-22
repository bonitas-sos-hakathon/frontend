import { useParentData } from './ParentLayout'
import { content } from '../../data/content'
import Icon from '../../components/Icon'

export default function DailyCardsPage() {
  const { cards: text } = content
  const { dailyTip } = useParentData()
  const card = dailyTip || { title: 'لا توجد نصيحة متاحة', content: 'يرجى إضافة نصائح مفعّلة في قاعدة البيانات.', category: '', example: '' }
  return <>
    <header className="page__head"><p className="page__eyebrow">{text.eyebrow}</p><h1 className="page__title">{text.title}</h1><p className="page__sub">{text.subtitle}</p></header>
    <div className="cards-layout">
      <article className="flash flash--cyan" aria-live="polite">
        <span className="flash__ring flash__ring--top" /><span className="flash__ring flash__ring--bottom" />
        <div className="flash__top"><span className="flash__tag">{card.category || text.today}</span><span className="flash__time">{text.today}</span></div>
        <span className="icon-box icon-box--white icon-box--lg"><Icon name="heart" size={30} /></span>
        <h2>{card.title}</h2><p className="flash__text">{card.content}</p>
        <div className="flash__try"><strong>{text.tryIt}</strong><p>{card.example || 'خصص وقتًا للحوار مع طفلك.'}</p></div>
        <div className="flash__foot"><span className="muted">نصيحة اليوم</span></div>
      </article>
      <aside className="card log"><div className="log__head"><h2>{text.log}</h2><span className="pill">{text.today}</span></div><ul><li><div className="log__item is-active"><span className="icon-box icon-box--soft icon-box--sm"><Icon name="heart" size={18} /></span><span className="log__text"><strong>{card.title}</strong><small>{card.category || text.today}</small></span><Icon name="check" size={16} /></div></li></ul></aside>
    </div>
  </>
}
