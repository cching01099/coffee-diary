export default function Avatar({ name, url }) {
  if (url) return <img src={url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  return (
    <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-sm flex-shrink-0">
      {(name || '?').slice(0, 1)}
    </div>
  )
}
