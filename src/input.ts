export type GlideState = {
  x: number;
  y: number;
  present: boolean;
  touch: boolean;
  turn?: number;
  tilt?: number;
  held?: boolean;
};
export function bindGlideInput(
  canvas: HTMLCanvasElement,
  enabled: () => boolean,
) {
  const state: GlideState = {
    x: 0,
    y: 0,
    present: false,
    touch: false,
    turn: 0,
    tilt: 0,
    held: false,
  };
  let primary: number | null = null;
  const keys = new Set<string>();
  function steering() {
    state.turn =
      keys.has("ArrowRight") || keys.has("KeyD")
        ? 1
        : keys.has("ArrowLeft") || keys.has("KeyA")
          ? -1
          : state.present
            ? state.x
            : 0;
    state.tilt =
      keys.has("ArrowUp") || keys.has("KeyW")
        ? 1
        : keys.has("ArrowDown") || keys.has("KeyS")
          ? -1
          : state.present
            ? state.y
            : 0;
  }
  function key(e: KeyboardEvent) {
    if (
      document.activeElement !== canvas ||
      !enabled() ||
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "KeyA",
        "KeyD",
        "KeyW",
        "KeyS",
      ].includes(e.code)
    )
      return;
    e.preventDefault();
    if (e.type === "keydown") keys.add(e.code);
    else keys.delete(e.code);
    steering();
  }
  function clear() {
    state.x = 0;
    state.y = 0;
    state.turn = 0;
    state.tilt = 0;
    keys.clear();
    state.present = false;
    state.touch = false;
    state.held = false;
    if (primary !== null && canvas.hasPointerCapture(primary))
      canvas.releasePointerCapture(primary);
    primary = null;
  }
  function move(e: PointerEvent) {
    if (
      !enabled() ||
      !e.isPrimary ||
      (e.pointerType === "touch" && e.pointerId !== primary)
    )
      return;
    // Chorded mouse presses/releases arrive as pointermove. Reconcile only
    // a gesture born on this canvas, so a UI-origin drag cannot arm boost.
    if (e.pointerType === "mouse" && e.pointerId === primary) {
      const held = (e.buttons & 1) !== 0;
      if (held && !state.held) canvas.focus({ preventScroll: true });
      state.held = held;
    }
    const r = canvas.getBoundingClientRect();
    state.x = Math.max(
      -1,
      Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1),
    );
    state.y = Math.max(
      -1,
      Math.min(1, 1 - ((e.clientY - r.top) / r.height) * 2),
    );
    state.present = true;
    steering();
  }
  function down(e: PointerEvent) {
    if (!enabled() || !e.isPrimary) return;
    const mouse = e.pointerType === "mouse";
    if (!mouse && e.button !== 0) return;
    const held = mouse ? (e.buttons & 1) !== 0 : true;
    if (held) canvas.focus({ preventScroll: true });
    // Own the whole mouse chord until its final button is released.
    primary = e.pointerId;
    state.touch = e.pointerType === "touch";
    state.held = held;
    canvas.setPointerCapture(primary);
    move(e);
  }
  function up(e: PointerEvent) {
    if (e.pointerId === primary) {
      state.held = false;
      if (state.touch) clear();
      else {
        if (canvas.hasPointerCapture(primary))
          canvas.releasePointerCapture(primary);
        primary = null;
      }
    }
  }
  function cancel(e: PointerEvent) {
    if (e.pointerType !== "touch" || e.pointerId === primary) clear();
  }
  function lost(e: PointerEvent) {
    if (e.pointerId === primary) clear();
  }
  function leave() {
    if (primary === null) clear();
  }
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("lostpointercapture", lost);
  canvas.addEventListener("keydown", key);
  canvas.addEventListener("keyup", key);
  canvas.addEventListener("blur", clear);
  window.addEventListener("blur", clear);
  return {
    state,
    clear,
    dispose() {
      clear();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("lostpointercapture", lost);
      canvas.removeEventListener("keydown", key);
      canvas.removeEventListener("keyup", key);
      canvas.removeEventListener("blur", clear);
      window.removeEventListener("blur", clear);
    },
  };
}
