export function generateProportionalSharesGradient(data: [string, number][], colorPrefix=`color`) {
    const n = data.length;
    let pct = 0;
    let segments = [];
    for (let i = 0; i < n; i++) {
      const entry = data[i];
      const color = `var(--${colorPrefix}-${entry[0].toLowerCase()})`;
      const start = `${Math.round(pct * 100)}%`;
      pct += entry[1];
      const end = i === n - 1 ? '100%' : `${Math.round(pct * 100)}%`;
      segments.push(`${color} ${start} ${end}`);
    }
    return segments.join(', ');
}