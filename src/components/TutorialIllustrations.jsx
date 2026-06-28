import React from "react";

const panel = "#111114";
const border = "#2a2a30";
const cyan = "#00c8e8";
const gold = "#c9a962";
const muted = "#6b6b78";
const text = "#e8e8ec";

function IllustrationFrame({ children, label }) {
  return (
    <div className="tutorial-illustration" dir="ltr" aria-hidden="true">
      <svg viewBox="0 0 320 180" className="tutorial-illustration-svg" role="img">
        <title>{label}</title>
        <rect width="320" height="180" rx="6" fill={panel} stroke={border} strokeWidth="1" />
        {children}
      </svg>
    </div>
  );
}

export function LoginIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      <rect x="80" y="36" width="160" height="108" rx="4" fill="#0a0a0c" stroke={border} />
      <text x="160" y="62" textAnchor="middle" fill={cyan} fontSize="8" fontFamily="system-ui,sans-serif" letterSpacing="3">
        ACCESS CODE
      </text>
      <rect x="100" y="72" width="120" height="22" rx="2" fill="#050505" stroke={cyan} strokeWidth="1" />
      <text x="160" y="87" textAnchor="middle" fill={cyan} fontSize="11" fontFamily="monospace">
        KREMER
      </text>
      <rect x="110" y="108" width="100" height="22" rx="2" fill={cyan} fillOpacity="0.15" stroke={cyan} />
      <text x="160" y="123" textAnchor="middle" fill={cyan} fontSize="9" fontFamily="system-ui,sans-serif">
        Sign in
      </text>
      <circle cx="48" cy="90" r="18" fill="none" stroke={gold} strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M42 90 L46 94 L54 84" stroke={gold} strokeWidth="2" fill="none" strokeLinecap="round" />
    </IllustrationFrame>
  );
}

export function DashboardIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      <rect x="16" y="20" width="288" height="48" rx="3" fill="#0a0a0c" stroke={border} />
      <text x="28" y="38" fill={cyan} fontSize="7" fontFamily="system-ui,sans-serif" letterSpacing="2">
        DASHBOARD
      </text>
      <text x="28" y="56" fill={gold} fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="600">
        Hello, Couple
      </text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={16 + i * 74} y="82" width="66" height="36" rx="3" fill="#0a0a0c" stroke={border} />
          <rect x={22 + i * 74} y="90" width="30" height="4" rx="1" fill={muted} fillOpacity="0.5" />
          <rect x={22 + i * 74} y="100" width="44" height="6" rx="1" fill={i === 2 ? gold : text} fillOpacity="0.7" />
        </g>
      ))}
      <rect x="16" y="130" width="90" height="24" rx="2" fill={cyan} fillOpacity="0.2" stroke={cyan} />
      <rect x="114" y="130" width="90" height="24" rx="2" fill={gold} fillOpacity="0.15" stroke={gold} />
      <rect x="212" y="130" width="92" height="24" rx="2" fill="#0a0a0c" stroke={border} />
    </IllustrationFrame>
  );
}

export function EventDetailsIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      <text x="24" y="36" fill={gold} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600">
        Event details
      </text>
      <text x="24" y="52" fill={muted} fontSize="7" fontFamily="system-ui,sans-serif">
        Step 1 of 7
      </text>
      <rect x="24" y="64" width="120" height="8" rx="1" fill={cyan} fillOpacity="0.3" />
      <rect x="24" y="64" width="48" height="8" rx="1" fill={cyan} />
      <text x="24" y="88" fill={cyan} fontSize="7" fontFamily="system-ui,sans-serif" letterSpacing="1">
        EVENT DATE
      </text>
      <rect x="24" y="94" width="130" height="22" rx="2" fill="#0a0a0c" stroke={border} />
      <text x="34" y="109" fill={text} fontSize="9" fontFamily="system-ui,sans-serif">
        2027-01-01
      </text>
      <text x="170" y="88" fill={cyan} fontSize="7" fontFamily="system-ui,sans-serif" letterSpacing="1">
        LOCATION
      </text>
      <rect x="170" y="94" width="126" height="22" rx="2" fill="#0a0a0c" stroke={border} />
      <text x="180" y="109" fill={text} fontSize="9" fontFamily="system-ui,sans-serif">
        Venue name...
      </text>
      <rect x="200" y="140" width="96" height="24" rx="2" fill={cyan} fillOpacity="0.2" stroke={cyan} />
      <text x="248" y="156" textAnchor="middle" fill={cyan} fontSize="8" fontFamily="system-ui,sans-serif">
        Continue
      </text>
    </IllustrationFrame>
  );
}

export function TimelineIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      <text x="24" y="34" fill={gold} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600">
        Wedding timeline
      </text>
      {[
        { y: 52, time: "18:00", event: "Reception" },
        { y: 78, time: "19:30", event: "Ceremony" },
        { y: 104, time: "22:00", event: "Dancing" },
      ].map(({ y, time, event }) => (
        <g key={y}>
          <rect x="24" y={y} width="52" height="20" rx="2" fill="#0a0a0c" stroke={border} />
          <text x="50" y={y + 13} textAnchor="middle" fill={cyan} fontSize="8" fontFamily="monospace">
            {time}
          </text>
          <rect x="84" y={y} width="160" height="20" rx="2" fill="#0a0a0c" stroke={border} />
          <text x="94" y={y + 13} fill={text} fontSize="8" fontFamily="system-ui,sans-serif">
            {event}
          </text>
          <circle cx="264" cy={y + 10} r="6" fill="none" stroke={gold} strokeWidth="1" />
          <line x1="264" y1={y + 4} x2="264" y2={y + 16} stroke={gold} strokeWidth="1.5" />
          <line x1="260" y1={y + 10} x2="268" y2={y + 10} stroke={gold} strokeWidth="1.5" />
        </g>
      ))}
      <line x1="270" y1="62" x2="270" y2="114" stroke={border} strokeWidth="1" strokeDasharray="3 2" />
    </IllustrationFrame>
  );
}

export function GenresIllustration({ label }) {
  const colors = ["#e040fb", "#00c8e8", "#ff6b2c", "#c9a962", "#4caf50", "#2196f3"];
  return (
    <IllustrationFrame label={label}>
      <text x="24" y="30" fill={muted} fontSize="7" fontFamily="system-ui,sans-serif">
        Tap a style to listen & rate
      </text>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 24 + col * 98;
        const y = 42 + row * 58;
        const rated = i === 1 || i === 4;
        return (
          <g key={i}>
            <rect x={x} y={y} width="88" height="50" rx="3" fill="#0a0a0c" stroke={rated ? colors[i] : border} />
            <rect x={x} y={y} width="4" height="50" rx="1" fill={colors[i]} />
            <text x={x + 12} y={y + 18} fill={text} fontSize="8" fontFamily="system-ui,sans-serif" fontWeight="600">
              Style
            </text>
            {rated ? (
              <>
                {[1, 2, 3, 4, 5].map((s) => (
                  <circle
                    key={s}
                    cx={x + 10 + s * 12}
                    cy={y + 36}
                    r="4"
                    fill={s <= (i === 1 ? 5 : 3) ? gold : "none"}
                    stroke={gold}
                    strokeWidth="1"
                  />
                ))}
              </>
            ) : (
              <text x={x + 12} y={y + 38} fill={cyan} fontSize="6" fontFamily="system-ui,sans-serif">
                Tap to listen
              </text>
            )}
          </g>
        );
      })}
    </IllustrationFrame>
  );
}

export function EnergyIllustration({ label }) {
  const levels = [
    { x: 24, label: "Chill", active: false },
    { x: 118, label: "Mixed", active: true },
    { x: 212, label: "Party", active: false },
  ];
  return (
    <IllustrationFrame label={label}>
      <text x="24" y="34" fill={gold} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600">
        Energy level
      </text>
      {levels.map(({ x, label: lvl, active }) => (
        <g key={x}>
          <rect
            x={x}
            y="52"
            width="84"
            height="72"
            rx="3"
            fill={active ? "rgba(0,200,232,0.1)" : "#0a0a0c"}
            stroke={active ? cyan : border}
          />
          <text x={x + 42} y="78" textAnchor="middle" fill={text} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="700">
            {lvl}
          </text>
          <rect x={x + 16} y="88" width="52" height="4" rx="1" fill={muted} fillOpacity="0.4" />
          <rect x={x + 16} y="98" width="40" height="4" rx="1" fill={muted} fillOpacity="0.3" />
          {active && (
            <circle cx={x + 72} cy="58" r="5" fill={cyan} fillOpacity="0.3" stroke={cyan} />
          )}
        </g>
      ))}
      <path d="M48 148 Q80 130 112 148 T176 148" stroke={cyan} strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M176 148 Q208 120 240 148" stroke={gold} strokeWidth="2" fill="none" opacity="0.6" />
    </IllustrationFrame>
  );
}

export function PhasesIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      {[
        { y: 28, phase: "Reception", tags: ["Israeli", "Oldies"] },
        { y: 78, phase: "Dancing", tags: ["Techno", "Trance", "Hip Hop"] },
        { y: 128, phase: "Hora", tags: ["Mizrahit"] },
      ].map(({ y, phase, tags }) => (
        <g key={y}>
          <rect x="16" y={y} width="288" height="42" rx="3" fill="#0a0a0c" stroke={border} />
          <text x="28" y={y + 16} fill={gold} fontSize="8" fontFamily="system-ui,sans-serif" fontWeight="600">
            {phase}
          </text>
          {tags.map((tag, i) => (
            <g key={tag}>
              <rect x={28 + i * 62} y={y + 22} width="56" height="14" rx="7" fill="rgba(201,169,98,0.2)" stroke={gold} strokeWidth="0.5" />
              <text x={56 + i * 62} y={y + 32} textAnchor="middle" fill={text} fontSize="6" fontFamily="system-ui,sans-serif">
                {tag}
              </text>
            </g>
          ))}
        </g>
      ))}
    </IllustrationFrame>
  );
}

export function PlaylistsIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      <text x="24" y="32" fill={cyan} fontSize="7" fontFamily="system-ui,sans-serif" letterSpacing="1">
        MUST PLAY
      </text>
      <rect x="24" y="38" width="272" height="28" rx="2" fill="#0a0a0c" stroke={border} />
      <rect x="32" y="48" width="80" height="10" rx="5" fill="rgba(0,200,232,0.15)" stroke={cyan} strokeWidth="0.5" />
      <text x="72" y="56" textAnchor="middle" fill={cyan} fontSize="6" fontFamily="system-ui,sans-serif">
        Entrance song
      </text>
      <text x="24" y="84" fill="#ff6b2c" fontSize="7" fontFamily="system-ui,sans-serif" letterSpacing="1">
        DO NOT PLAY
      </text>
      <rect x="24" y="90" width="272" height="28" rx="2" fill="#0a0a0c" stroke={border} />
      <rect x="32" y="100" width="64" height="10" rx="5" fill="rgba(255,107,44,0.15)" stroke="#ff6b2c" strokeWidth="0.5" />
      <text x="24" y="136" fill={muted} fontSize="7" fontFamily="system-ui,sans-serif" letterSpacing="1">
        DJ NOTES
      </text>
      <rect x="24" y="142" width="272" height="28" rx="2" fill="#0a0a0c" stroke={border} />
      <line x1="32" y1="152" x2="120" y2="152" stroke={muted} strokeWidth="1" opacity="0.5" />
      <line x1="32" y1="160" x2="180" y2="160" stroke={muted} strokeWidth="1" opacity="0.3" />
    </IllustrationFrame>
  );
}

export function SummaryIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      <text x="24" y="34" fill={gold} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600">
        Review your choices
      </text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="24" y={48 + i * 28} width="220" height="20" rx="2" fill="#0a0a0c" stroke={border} />
          <rect x="32" y={56 + i * 28} width="60" height="4" rx="1" fill={muted} fillOpacity="0.4" />
          <rect x="100" y={56 + i * 28} width="80" height="4" rx="1" fill={text} fillOpacity="0.5" />
          <path d={`M252 ${58 + i * 28} L256 ${62 + i * 28} L264 ${54 + i * 28}`} stroke={cyan} strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <rect x="180" y="148" width="116" height="22" rx="2" fill={gold} fillOpacity="0.2" stroke={gold} />
      <text x="238" y="163" textAnchor="middle" fill={gold} fontSize="8" fontFamily="system-ui,sans-serif">
        Finish form
      </text>
    </IllustrationFrame>
  );
}

export function BrowseIllustration({ label }) {
  return (
    <IllustrationFrame label={label}>
      <rect x="16" y="16" width="40" height="40" rx="3" fill="#0a0a0c" stroke={border} />
      <rect x="64" y="20" width="120" height="8" rx="1" fill={text} fillOpacity="0.6" />
      <rect x="64" y="34" width="80" height="6" rx="1" fill={muted} fillOpacity="0.5" />
      <rect x="64" y="46" width="48" height="6" rx="3" fill="rgba(0,200,232,0.2)" stroke={cyan} strokeWidth="0.5" />
      <rect x="16" y="64" width="288" height="28" rx="2" fill="#0a0a0c" stroke={border} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((i) => (
        <rect
          key={i}
          x={24 + i * 13}
          y={72 + (i % 3) * 3}
          width="4"
          height={8 + (i % 5) * 4}
          rx="1"
          fill={i > 10 ? cyan : muted}
          fillOpacity={0.4 + (i % 5) * 0.1}
        />
      ))}
      <g transform="translate(200, 108)">
        <rect x="0" y="0" width="28" height="28" rx="3" fill="#0a0a0c" stroke="#ff6b2c" strokeWidth="1" />
        <rect x="36" y="0" width="28" height="28" rx="3" fill="#0a0a0c" stroke={muted} />
        <text x="50" y="18" textAnchor="middle" fill={muted} fontSize="8" fontFamily="system-ui,sans-serif">
          OK
        </text>
        <rect x="72" y="0" width="28" height="28" rx="3" fill="#0a0a0c" stroke={cyan} strokeWidth="1.5" />
        <path d="M82 18 L86 22 L94 12" stroke={cyan} strokeWidth="1.5" fill="none" />
      </g>
      <rect x="16" y="148" width="180" height="18" rx="2" fill="#0a0a0c" stroke={border} />
      <text x="24" y="160" fill={muted} fontSize="7" fontFamily="system-ui,sans-serif">
        Add a comment...
      </text>
    </IllustrationFrame>
  );
}

export const TUTORIAL_ILLUSTRATIONS = {
  login: LoginIllustration,
  dashboard: DashboardIllustration,
  eventDetails: EventDetailsIllustration,
  timeline: TimelineIllustration,
  genres: GenresIllustration,
  energy: EnergyIllustration,
  phases: PhasesIllustration,
  playlists: PlaylistsIllustration,
  summary: SummaryIllustration,
  browse: BrowseIllustration,
};
