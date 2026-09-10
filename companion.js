// ============================================================
// GHIBLI FOREST — companion.js
// Tiny original woodland spirit — SVG based, reactive expressions
// ============================================================

const Companion = (() => {
  let mood = "content"; // content | happy | sleepy | celebrating | wandering | curious
  let el = null;

  const FACE = {
    content:      { eyes: "M -8 0 Q -8 4 -4 4 Q 0 4 0 0",  mouth: "M -6 6 Q 0 9 6 6" },
    happy:        { eyes: "arc", mouth: "M -7 5 Q 0 12 7 5" },
    sleepy:       { eyes: "M -9 1 L -2 1 M 2 1 L 9 1",     mouth: "M -4 7 Q 0 6 4 7" },
    celebrating:  { eyes: "arc", mouth: "M -8 4 Q 0 13 8 4" },
    wandering:    { eyes: "M -8 0 Q -8 4 -4 4 Q 0 4 0 0",  mouth: "M -4 6 Q 0 7 4 6" },
    curious:      { eyes: "round", mouth: "M -3 7 Q 0 8 3 7" },
  };

  function svg() {
    return `
    <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">
      <defs>
        <radialGradient id="lf-body" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#F6EFDD"/>
          <stop offset="100%" stop-color="#DCCFAE"/>
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="100" rx="30" ry="6" fill="#5B7052" opacity="0.15"/>
      <g id="lf-body-g">
        <path d="M60 20 C30 20 18 46 22 70 C25 92 42 104 60 104 C78 104 95 92 98 70 C102 46 90 20 60 20 Z" fill="url(#lf-body)"/>
        <ellipse cx="60" cy="18" rx="11" ry="14" fill="#8FA87D"/>
        <ellipse cx="60" cy="18" rx="5" ry="8" fill="#5B7052"/>
        <g id="lf-eyes" transform="translate(60,64)" stroke="#4A5A3E" stroke-width="4.5" stroke-linecap="round" fill="none"></g>
        <g id="lf-cheeks" opacity="0.5">
          <ellipse cx="34" cy="72" rx="6" ry="4" fill="#E3AE87"/>
          <ellipse cx="86" cy="72" rx="6" ry="4" fill="#E3AE87"/>
        </g>
        <path id="lf-mouth" transform="translate(60,68)" stroke="#4A5A3E" stroke-width="3.4" stroke-linecap="round" fill="none" d=""/>
      </g>
    </svg>`;
  }

  function mount(container) {
    el = container;
    el.innerHTML = svg();
    render();
  }

  function render() {
    if (!el) return;
    const eyesG = el.querySelector("#lf-eyes");
    const mouth = el.querySelector("#lf-mouth");
    const face = FACE[mood] || FACE.content;

    if (face.eyes === "arc") {
      eyesG.innerHTML = `<path d="M -10 2 Q -6 -4 -2 2" /><path d="M 2 2 Q 6 -4 10 2" />`;
    } else if (face.eyes === "round") {
      eyesG.innerHTML = `<circle cx="-6" cy="0" r="3.4" fill="#4A5A3E" stroke="none"/><circle cx="6" cy="0" r="3.4" fill="#4A5A3E" stroke="none"/>`;
    } else {
      eyesG.innerHTML = `<path d="${face.eyes}" transform="translate(-6,0)"/><path d="${face.eyes}" transform="translate(6,0) scale(-1,1) translate(12,0)"/>`;
    }
    mouth.setAttribute("d", face.mouth);

    el.classList.remove("lf-bob", "lf-pulse");
    void el.offsetWidth;
    el.classList.add(mood === "celebrating" ? "lf-pulse" : "lf-bob");
  }

  function setMood(m) {
    mood = m;
    render();
  }

  function reactToHour(hour) {
    if (hour >= 22 || hour < 6) setMood("sleepy");
    else if (hour >= 6 && hour < 11) setMood("happy");
    else setMood("content");
  }

  function celebrate() {
    setMood("celebrating");
    setTimeout(() => setMood("content"), 2200);
  }

  function wander() {
    setMood("wandering");
  }

  return { mount, setMood, reactToHour, celebrate, wander, get mood() { return mood; } };
})();

// tiny CSS-driven bob/pulse animation attached dynamically
const lfStyle = document.createElement("style");
lfStyle.textContent = `
  .lf-bob { animation: lfBob 4.2s ease-in-out infinite; }
  .lf-pulse { animation: lfPulse 0.6s var(--ease-spring); }
  @keyframes lfBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes lfPulse { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
`;
document.head.appendChild(lfStyle);
