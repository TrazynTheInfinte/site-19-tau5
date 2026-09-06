import { useState } from 'react'
import RulesPanel from './RulesPanel'

export default function RulesButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>📖 Rules</button>
      {open && <RulesPanel onClose={() => setOpen(false)} />}
    </>
  )
}
