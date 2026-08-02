/** Caveira rindo exibida quando o sistema é invadido. */
const SKULL = String.raw`
        .-"""""""-.
      .'  _     _  '.
     /   (o)   (o)   \
    |                 |
    |  \_ _ _ _ _ _/  |
     \  |_|_|_|_|_|  /
      '.___________.'
     HA HA HA HA HA HA
`;

export function AsciiSkull() {
  return (
    <pre
      aria-hidden="true"
      className="select-none whitespace-pre text-center text-[10px] leading-tight text-threat sm:text-sm"
    >
      {SKULL}
    </pre>
  );
}
