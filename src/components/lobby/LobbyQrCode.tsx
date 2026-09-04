import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function LobbyQrCode({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 180 })
      .then((d) => {
        if (!cancelled) setDataUrl(d)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (!dataUrl) return null
  return <img src={dataUrl} alt="QR code to join this lobby" width={180} height={180} style={{ background: '#fff', padding: '0.5rem', borderRadius: '4px' }} />
}
