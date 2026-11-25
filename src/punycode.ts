/**
 * Punycode decoder (RFC 3492). Browsers show "xn--pypal-4ve.com" in href
 * values; decoding it reveals "pаypal.com" with a Cyrillic "а".
 */
const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;

function adapt(delta: number, numPoints: number, first: boolean): number {
  delta = first ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

function digit(cp: number): number {
  if (cp >= 48 && cp <= 57) return cp - 22;   // 0-9 -> 26-35
  if (cp >= 65 && cp <= 90) return cp - 65;   // A-Z
  if (cp >= 97 && cp <= 122) return cp - 97;  // a-z
  return BASE;
}

/** Decode the part after "xn--". Throws on invalid input. */
export function decode(input: string): string {
  const output: number[] = [];
  const basicEnd = input.lastIndexOf("-");
  for (let j = 0; j < Math.max(0, basicEnd); j++) {
    if (input.charCodeAt(j) >= 0x80) throw new Error("not basic");
    output.push(input.charCodeAt(j));
  }
  let n = INITIAL_N, bias = INITIAL_BIAS, i = 0;
  for (let idx = basicEnd > 0 ? basicEnd + 1 : 0; idx < input.length;) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (idx >= input.length) throw new Error("bad input");
      const d = digit(input.charCodeAt(idx++));
      if (d >= BASE) throw new Error("bad digit");
      i += d * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (d < t) break;
      w *= BASE - t;
    }
    const len = output.length + 1;
    bias = adapt(i - oldi, len, oldi === 0);
    n += Math.floor(i / len);
    i %= len;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

/** "xn--pypal-4ve" -> "pаypal"; other labels are returned unchanged. */
export function toUnicodeLabel(label: string): string {
  if (!label.toLowerCase().startsWith("xn--")) return label;
  try {
    return decode(label.slice(4).toLowerCase());
  } catch {
    return label;
  }
}
