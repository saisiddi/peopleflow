export default function WaveLogo({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={light ? '#FFFFFF' : '#061524'} />
      <path
        d="M6 21c3 0 4-3 6.5-3s3.5 3 6.5 3 3-3 6.5-3"
        stroke="#4CC2FF" strokeWidth="2.6" strokeLinecap="round"
      />
      <path
        d="M6 14c3 0 4-3 6.5-3s3.5 3 6.5 3 3-3 6.5-3"
        stroke="#4CC2FF" strokeWidth="2.6" strokeLinecap="round" opacity=".45"
      />
    </svg>
  )
}
