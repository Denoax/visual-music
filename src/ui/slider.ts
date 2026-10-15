import {
  predictSliderFlight,
  sliderFlightPoint,
  sliderValue,
  type SliderFlight,
  type SliderPoint,
} from "./donor/sliderFlight";

/** Vanilla port of the owned AngrySlider: its ballistic flight/impact math and
 * SVG paint stay intact; native range owns keyboard and AT semantics. */
export function bindOwnedSlider(
  root: HTMLElement,
  reduced: () => boolean,
  onChange: (value: number) => void,
) {
  const input = root.querySelector<HTMLInputElement>("input")!,
    holder = root.querySelector<HTMLElement>(".angry-slider-gesture")!;
  const output = root.querySelector("output")!,
    track = holder.querySelector<SVGLineElement>(".angry-slider-track")!,
    fill = holder.querySelector<SVGLineElement>(".angry-slider-fill")!,
    rest = holder.querySelector<SVGEllipseElement>("ellipse")!;
  const layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  layer.setAttribute("class", "slider-paint-layer");
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML =
    '<path class="angry-slider-trajectory"/><path class="angry-slider-tether"/><g class="angry-slider-target"><path d="M0 -5 V5"/><text text-anchor="middle" y="-13"/></g><ellipse rx="6" ry="6"/>';
  document.body.append(layer);
  const trajectory = layer.children[0],
    tether = layer.children[1],
    marker = layer.children[2],
    thumb = layer.children[3];
  const min = Number(input.min),
    max = Number(input.max);
  let value = Number(input.value),
    width = 300,
    pose: SliderPoint = { x: (value - min) / (max - min), y: 0 };
  let phase = "idle",
    generation = 0,
    raf = 0,
    flight: SliderFlight | null = null;
  let gesture: {
    id: number;
    clientX: number;
    clientY: number;
    origin: SliderPoint;
    anchor: SliderPoint;
    raw: SliderPoint;
    elastic: boolean;
  } | null = null;
  let frame = { left: 0, top: 0 };
  const length = () => Math.max(1, width - 24),
    normal = () => (value - min) / (max - min),
    local = (x: number) => 12 + x * length(),
    px = (x: number) => frame.left + local(x),
    py = (y: number) => frame.top + 46 + y * length();
  function draw(squash = 0) {
    const moving =
      gesture?.elastic || ["flight", "impact", "settle"].includes(phase);
    layer.style.display = moving ? "block" : "none";
    root.dataset.sliderPhase = phase;
    root.dataset.poseX = String(pose.x);
    root.dataset.poseY = String(pose.y);
    root.dataset.predicted = String(flight?.target ?? normal());
    root.dataset.reduced = String(reduced());
    track.setAttribute("x2", String(width - 12));
    fill.setAttribute("x2", String(local(normal())));
    rest.setAttribute("cx", String(local(pose.x)));
    rest.setAttribute("cy", String(46 + pose.y * length()));
    rest.setAttribute("visibility", moving ? "hidden" : "visible");
    thumb.setAttribute("cx", String(px(pose.x)));
    thumb.setAttribute("cy", String(py(pose.y)));
    thumb.setAttribute("rx", String(6 * (1 + squash)));
    thumb.setAttribute("ry", String(6 * (1 - squash)));
    const pulling = gesture?.elastic;
    tether.setAttribute("visibility", pulling ? "visible" : "hidden");
    if (pulling && gesture) {
      const a = px(gesture.anchor.x);
      tether.setAttribute(
        "d",
        `M${a - 4} ${py(0)} L${px(pose.x)} ${py(pose.y)} L${a + 4} ${py(0)}`,
      );
    }
    const preview = flight && (pulling || phase === "flight");
    trajectory.setAttribute("visibility", preview ? "visible" : "hidden");
    marker.setAttribute("visibility", preview ? "visible" : "hidden");
    if (preview && flight) {
      let d = "";
      for (let i = 0; i <= 20; i++) {
        const p = sliderFlightPoint(flight, i / 20);
        d += `${i ? " L" : "M"}${px(p.x)} ${py(p.y)}`;
      }
      trajectory.setAttribute("d", d);
      marker.setAttribute(
        "transform",
        `translate(${px(flight.target)} ${py(0)})`,
      );
      marker.querySelector("text")!.textContent =
        `${sliderValue(flight.target, min, max)}%`;
    }
  }
  function set(next: number, notify = false) {
    value = Math.max(min, Math.min(max, next));
    input.value = String(value);
    input.setAttribute("aria-valuetext", `${value} percent`);
    output.textContent = `${value}%`;
    if (!gesture && !raf) pose = { x: normal(), y: 0 };
    draw();
    if (notify) onChange(value);
  }
  function cancel() {
    generation++;
    cancelAnimationFrame(raf);
    raf = 0;
    const id = gesture?.id;
    gesture = null;
    flight = null;
    phase = "idle";
    if (id !== undefined && holder.hasPointerCapture(id))
      holder.releasePointerCapture(id);
    pose = { x: normal(), y: 0 };
    draw();
  }
  const commit = (x: number) => set(sliderValue(x, min, max), true);
  holder.onpointerdown = (e) => {
    if (
      reduced() ||
      e.button !== 0 ||
      !e.isPrimary ||
      gesture ||
      !holder.closest("dialog[open]")
    )
      return;
    e.preventDefault();
    input.focus({ preventScroll: true });
    const rect = holder.getBoundingClientRect();
    frame = { left: rect.left, top: rect.top };
    layer.style.color = getComputedStyle(holder).color;
    layer.style.zIndex = String(
      Number(getComputedStyle(holder.closest("dialog")!).zIndex) + 1,
    );
    const inFlight = raf !== 0;
    if (!inFlight) {
      const x = (e.clientX - rect.left - 12) / length();
      if (Math.abs(x - pose.x) * length() > 16) {
        pose = { x: Math.max(0, Math.min(1, x)), y: 0 };
        commit(pose.x);
      }
    }
    cancelAnimationFrame(raf);
    generation++;
    raf = 0;
    flight = null;
    gesture = {
      id: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      origin: { ...pose },
      raw: { ...pose },
      anchor: { x: normal(), y: 0 },
      elastic: inFlight,
    };
    phase = "press";
    holder.setPointerCapture(e.pointerId);
    draw();
  };
  holder.onpointermove = (e) => {
    const g = gesture;
    if (!g || g.id !== e.pointerId) return;
    const dx = (e.clientX - g.clientX) / length(),
      dy = (e.clientY - g.clientY) / length();
    g.raw = { x: g.origin.x + dx, y: g.origin.y + dy };
    if (
      !g.elastic &&
      (Math.abs(dy) > 0.025 || g.raw.x < -0.015 || g.raw.x > 1.015)
    ) {
      g.anchor = { x: Math.max(0, Math.min(1, pose.x)), y: 0 };
      g.elastic = true;
    }
    pose = {
      x: Math.max(g.elastic ? -0.6 : 0, Math.min(g.elastic ? 1.6 : 1, g.raw.x)),
      y: g.elastic ? Math.max(-0.6, Math.min(0.6, g.raw.y)) : 0,
    };
    if (g.elastic) {
      phase = "pull";
      flight = predictSliderFlight(g.anchor, pose);
    } else {
      phase = "drag";
      commit(pose.x);
    }
    draw();
  };
  holder.onpointerup = (e) => {
    if (gesture?.id !== e.pointerId) return;
    const g = gesture,
      f = flight;
    gesture = null;
    if (holder.hasPointerCapture(g.id)) holder.releasePointerCapture(g.id);
    if (!g.elastic || !f || reduced()) {
      flight = null;
      phase = "idle";
      pose = { x: normal(), y: 0 };
      draw();
      return;
    }
    commit(f.target);
    phase = "flight";
    const token = ++generation,
      started = performance.now(),
      duration = f.duration * 1000;
    const step = (now: number) => {
      if (token !== generation) return;
      const age = now - started;
      if (age < duration) {
        pose = sliderFlightPoint(f, age / duration);
        draw();
      } else {
        const t = (age - duration) / 1000;
        phase = t < 0.07 ? "impact" : "settle";
        pose = {
          x: normal(),
          y: -0.018 * Math.exp(-t * 13) * Math.sin(t * 38),
        };
        draw(0.18 * Math.exp(-t * 16));
      }
      if (age < duration + 360) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        flight = null;
        phase = "idle";
        pose = { x: normal(), y: 0 };
        draw();
      }
    };
    raf = requestAnimationFrame(step);
  };
  holder.onpointercancel = cancel;
  holder.onlostpointercapture = () => {
    if (gesture) cancel();
  };
  input.onkeydown = () => {
    if (raf || gesture) cancel();
  };
  input.oninput = () => set(Number(input.value), true);
  const resize = () => {
    width = holder.clientWidth || 300;
    cancel();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(holder);
  const hidden = () => {
    if (document.hidden) cancel();
  };
  const escape = (e: KeyboardEvent) => {
    if (e.key === "Escape") cancel();
  };
  window.addEventListener("blur", cancel);
  document.addEventListener("visibilitychange", hidden);
  window.addEventListener("keydown", escape);
  holder.closest("dialog")?.addEventListener("scroll", cancel, true);
  window.addEventListener("resize", cancel);
  set(value);
  return {
    set,
    cancel,
    dispose() {
      cancel();
      observer.disconnect();
      layer.remove();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("keydown", escape);
      holder.closest("dialog")?.removeEventListener("scroll", cancel, true);
      window.removeEventListener("resize", cancel);
    },
  };
}
