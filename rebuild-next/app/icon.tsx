import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        fontSize: 20,
        background: '#0ea5e9',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        color: 'white',
        fontWeight: 700,
        fontFamily: 'sans-serif',
      }}
    >
      J
    </div>,
    { ...size }
  )
}
