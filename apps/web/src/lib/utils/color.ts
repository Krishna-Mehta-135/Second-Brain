export function getCursorColor(userId: string): string {
  const colors = [
    "#f87171", // red-400
    "#fb923c", // orange-400
    "#fbbf24", // amber-400
    "#facc15", // yellow-400
    "#a3e635", // lime-400
    "#4ade80", // green-400
    "#34d399", // emerald-400
    "#2dd4bf", // teal-400
    "#22d3ee", // cyan-400
    "#38bdf8", // sky-400
    "#60a5fa", // blue-400
    "#818cf8", // indigo-400
    "#a78bfa", // violet-400
    "#c084fc", // purple-400
    "#e879f9", // fuchsia-400
    "#f472b6", // pink-400
    "#fb7185", // rose-400
  ];

  // Simple hash to consistently map userId to a color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length] ?? "#6366f1";
}
