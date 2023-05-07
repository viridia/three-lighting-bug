export function editDistance(a: string, b: string): number {
  const m: number[][] = [];
  const min = Math.min;

  if (!(a && b)) return (b || a).length;

  for (let i = 0; i <= b.length; m[i] = [i++]);
  for (let j = 0; j <= a.length; m[0][j] = j++);

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? m[i - 1][j - 1]
          : (m[i][j] = min(m[i - 1][j - 1] + 1, min(m[i][j - 1] + 1, m[i - 1][j] + 1)));
    }
  }

  return m[b.length][a.length];
}

export function suggestCorrections(word: string, suggestions: Iterable<string>) {
  let best: string = '';
  let bestDist = Infinity;
  for (let s of suggestions) {
    const dist = editDistance(word, s);
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }

  return best;
}
