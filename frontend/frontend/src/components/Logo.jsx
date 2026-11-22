import { content } from '../data/content'
import { Link } from '../lib/router'
import Icon from './Icon'

export default function Logo({ to = '/', onClick }) {
  const { brand } = content

  return (
    <Link to={to} className="logo" onClick={onClick}>
      <span className="logo__mark">
        <Icon name="heart" size={26} />
        <i className="logo__dot" />
      </span>
      <span className="logo__text">
        <b>
          {brand.name1} <em>{brand.name2}</em>
        </b>
        <small>{brand.tagline}</small>
      </span>
    </Link>
  )
}
