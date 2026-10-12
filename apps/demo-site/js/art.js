const colors = { Sand: '#c5aa88', Forest: '#58796b', Ink: '#354451', Clay: '#be7c64' };
export function productArt(key, color = 'Sand', view = 0) {
  const fill = colors[color] || colors.Sand;
  const shapes = {
    headphones: `<path d="M110 170v-25a90 90 0 0 1 180 0v25" fill="none" stroke="${fill}" stroke-width="24"/><rect x="92" y="148" width="46" height="87" rx="22"/><rect x="262" y="148" width="46" height="87" rx="22"/>`,
    backpack:
      '<rect x="123" y="77" width="154" height="181" rx="34"/><path d="M164 84V64h72v20" fill="none" stroke-width="12"/><rect x="145" y="172" width="110" height="62" rx="15" fill="#ffffff44"/>',
    mug: '<path d="M125 102h135v116q0 42-67 42t-68-42Z"/><path d="M259 128h30q40 0 40 41t-68 40" fill="none" stroke-width="18"/><ellipse cx="192" cy="102" rx="67" ry="15" fill="#ffffff66"/>',
    bottle:
      '<rect x="166" y="44" width="68" height="28" rx="8" fill="#354451"/><rect x="153" y="70" width="94" height="204" rx="30"/><rect x="155" y="131" width="90" height="77" rx="5" fill="#ffffff33"/>',
    throw:
      '<path d="M103 82h186l15 175H116Z"/><path d="M130 84l13 170m30-170 13 170m30-170 13 170m30-170 13 170" stroke="#ffffff55" stroke-width="8"/><path d="M119 258v16m19-16v16m19-16v16m19-16v16m19-16v16m19-16v16m19-16v16m19-16v16m19-16v16m19-16v16" stroke-width="4"/>',
    lamp: '<path d="M190 248V120q0-58 52-58" fill="none" stroke-width="13"/><path d="M207 101q0-65 65-51l39 68Z"/><ellipse cx="191" cy="254" rx="64" ry="15"/>',
    sneakers:
      '<path d="M99 153l67-35 54 52 75 28q33 12 24 47H87q-18-30 12-92Z"/><path d="M87 228h233v22H87Z" fill="#f7f2e8"/><path d="m167 148 42-7m-25 28 44-9m-25 29 44-11" stroke="#f7f2e8" stroke-width="7"/>',
    beanie:
      '<path d="M123 208V158a77 77 0 0 1 154 0v50Z"/><rect x="112" y="201" width="176" height="57" rx="14"/><path d="M150 119v80m25-91v91m25-93v93m25-91v91m25-80v80" stroke="#ffffff33" stroke-width="5"/>',
  };
  if (!Object.hasOwn(shapes, key)) throw new Error('Unknown product art');
  return `<svg viewBox="0 0 400 320" aria-hidden="true" focusable="false"><ellipse cx="200" cy="279" rx="107" ry="12" fill="#1f352a12"/><g fill="${fill}" stroke="${fill}" transform="rotate(${view === 1 ? -12 : view === 2 ? 12 : 0} 200 160)">${shapes[key]}</g></svg>`;
}
