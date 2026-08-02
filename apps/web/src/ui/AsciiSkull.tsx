/** Caveira exibida na abertura de cada hack e na tela de derrota. */
const SKULL = String.raw`
                 uuuuuuu
             uu$$$$$$$$$$$uu
          uu$$$$$$$$$$$$$$$$$uu
         u$$$$$$$$$$$$$$$$$$$$$u
        u$$$$$$$$$$$$$$$$$$$$$$$u
       u$$$$$$$$$$$$$$$$$$$$$$$$$u
       u$$$$$$$$$$$$$$$$$$$$$$$$$u
       u$$$$$$"   "$$$"   "$$$$$$u
       "$$$$"      u$u       $$$$"
        $$$u       u$u       u$$$
        $$$u      u$$$u      u$$$
         "$$$$uu$$$   $$$uu$$$$"
          "$$$$$$$"   "$$$$$$$"
            u$$$$$$$u$$$$$$$u
             u$"$"$"$"$"$"$u
  uuu        $$u$ $ $ $ $u$$       uuu
 u$$$$        $$$$$u$u$u$$$       u$$$$
  $$$$$uu      "$$$$$$$$$"     uu$$$$$$
u$$$$$$$$$$$uu    """""    uuuu$$$$$$$$$$
$$$$"""$$$$$$$$$$uuu   uu$$$$$$$$$"""$$$"
 """      ""$$$$$$$$$$$uu ""$"""
           uuuu ""$$$$$$$$$$uuu
  u$$$uuu$$$$$$$$$uu ""$$$$$$$$$$$uuu$$$
  $$$$$$$$$$""""           ""$$$$$$$$$$$"
   "$$$$$"                      ""$$$$""
     $$$"                         $$$$"
`;

interface AsciiSkullProps {
  /** 'corrupt' pisca em verde na abertura do hack; 'pulse' respira na derrota. */
  variant?: 'pulse' | 'corrupt';
}

export function AsciiSkull({ variant = 'pulse' }: AsciiSkullProps) {
  return (
    <pre
      aria-hidden="true"
      className={[
        'select-none overflow-x-auto whitespace-pre text-center leading-[1.05]',
        variant === 'corrupt'
          ? 'text-safe motion-safe:animate-skull-corrupt'
          : 'text-threat motion-safe:animate-skull-pulse',
      ].join(' ')}
      style={{ fontSize: 'clamp(4px, 3vw, 11px)' }}
    >
      {SKULL}
    </pre>
  );
}
