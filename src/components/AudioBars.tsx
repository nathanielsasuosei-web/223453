/** Small animated equalizer bars. */
export function AudioBars({
  playing,
  className = "",
  bars = 4,
}: {
  playing: boolean;
  className?: string;
  bars?: number;
}) {
  return (
    <span className={`flex items-end gap-[2px] ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-gradient-to-t from-brand to-brand-2 ${playing ? "animate-equalize" : ""}`}
          style={{
            height: `${35 + ((i * 23) % 55)}%`,
            animationDelay: `${i * 0.13}s`,
            animationDuration: `${0.85 + (i % 3) * 0.22}s`,
            opacity: playing ? 1 : 0.35,
            transform: playing ? undefined : "scaleY(0.5)",
          }}
        />
      ))}
    </span>
  );
}
