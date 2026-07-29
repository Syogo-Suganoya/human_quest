const PALETTE = [
  "bg-growth",
  "bg-ember",
  "bg-sun",
  "bg-tide",
  "bg-plum",
  "bg-blush",
  "bg-growth-dark",
  "bg-ember-dark",
];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
};

export default function Avatar({
  nickname,
  size = "md",
}: {
  nickname: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const initial = nickname.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white ${colorFor(
        nickname
      )} ${SIZE_CLASSES[size]}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
