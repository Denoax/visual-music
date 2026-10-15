import { attachPortfolioPane } from "./portfolio-pane.mjs";
import { navConnection } from "./donor/navConnection";
import { CriticalDamper } from "./donor/criticalDamper";
import { bindOwnedSlider } from "./slider";
const CLOSE =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const MENU =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
export function bindPortfolioControls(
  onOpen: () => void,
  onVolume: (value: number) => void,
  onPreferences: () => void,
) {
  const reduced = document.querySelector<HTMLInputElement>("#reduced")!,
    settings = document.querySelector<HTMLDialogElement>("#settings")!,
    credits = document.querySelector<HTMLDialogElement>("#credits")!;
  const utility = document.querySelector<HTMLButtonElement>("#menu-button")!,
    shell = document.querySelector<HTMLElement>("#portfolio-utilities")!;
  const lowMotion = () =>
    reduced.checked || matchMedia("(prefers-reduced-motion:reduce)").matches;
  const volume = bindOwnedSlider(
    document.querySelector("#volume-slider")!,
    lowMotion,
    (v) => onVolume(v / 100),
  );
  const brightness = bindOwnedSlider(
    document.querySelector("#brightness-slider")!,
    lowMotion,
    () => onPreferences(),
  );
  let menuOpen = false,
    raf = 0,
    last = 0;
  const gaps = new Map<HTMLElement, CriticalDamper>();
  function menu(open: boolean) {
    menuOpen = open;
    shell.classList.toggle("portfolio-nav-shell--open", open);
    utility.setAttribute("aria-expanded", String(open));
    utility.innerHTML = open ? CLOSE : MENU;
    if (open) onOpen();
  }
  const closed = () => {
    updateNav();
  };
  const panes = [
    attachPortfolioPane(settings, {
      trigger: document.querySelector("#settings-button")!,
      onOpen: () => {
        onOpen();
        menu(false);
        updateNav();
      },
      onClosed: closed,
      reduced: lowMotion,
      fallbackFocus: utility,
    }),
    attachPortfolioPane(credits, {
      trigger: document.querySelector("#credits-button")!,
      onOpen: () => {
        onOpen();
        menu(false);
        updateNav();
      },
      onClosed: closed,
      reduced: lowMotion,
      fallbackFocus: utility,
    }),
  ];
  for (const p of [settings, credits])
    p.querySelector<HTMLButtonElement>(".pane-close")!.onclick = () => {
      volume.cancel();
      brightness.cancel();
      panes[p === settings ? 0 : 1].close();
    };
  utility.onclick = () => menu(!menuOpen);
  utility.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) {
      e.preventDefault();
      menu(false);
    }
  });
  shell.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) {
      e.preventDefault();
      menu(false);
      utility.focus();
    }
  });
  reduced.addEventListener("change", () => {
    volume.cancel();
    brightness.cancel();
    updateNav();
  });
  const navButtons = [
    ...document.querySelectorAll<HTMLButtonElement>("#controls .gooey-label"),
  ];
  navButtons.forEach((b, i) => {
    const svg = b.closest("li")!.querySelector("svg")!;
    const id = `nav-neck-${i}`;
    svg.setAttribute("width", "48");
    svg.setAttribute("viewBox", "-34 0 48 40");
    svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0"/><stop offset="1"/></linearGradient></defs><path fill="url(#${id})"/>`;
  });
  const selectedPane = () =>
    [settings, credits]
      .filter((p) => p.open)
      .sort(
        (a, b) => Number(b.dataset.paneOrder) - Number(a.dataset.paneOrder),
      )[0];
  for (const pane of [settings, credits]) {
    pane.addEventListener("focusin", updateNav);
    pane.addEventListener("pointerdown", updateNav);
  }
  function updateNav() {
    const visible = [
      ...document.querySelectorAll<HTMLButtonElement>("#controls .gooey-label"),
    ].filter((b) => !b.hidden);
    for (const b of document.querySelectorAll<HTMLButtonElement>(
      "#controls .gooey-label",
    ))
      b.closest<HTMLElement>("li")!.hidden = b.hidden;
    const selected =
      selectedPane()?.id === "settings"
        ? "settings-button"
        : selectedPane()?.id === "credits"
          ? "credits-button"
          : "";
    visible.forEach((b) => {
      b.dataset.active = String(b.id === selected);
      b.classList.toggle("gooey-color-in", b.id === selected);
      b.classList.toggle("gooey-color-out", b.id !== selected);
      b.closest<HTMLElement>("li")!.classList.add("gooey-color-in");
      b.closest<HTMLElement>("li")!.style.backgroundColor =
        b.id === selected ? "var(--nav-selected)" : "var(--nav-body)";
    });
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(animateNav);
    }
  }
  function animateNav(now: number) {
    const dt = (now - last) / 1000;
    last = now;
    let moving = false;
    const list = [
        ...document.querySelectorAll<HTMLButtonElement>(
          "#controls .gooey-label",
        ),
      ].filter((b) => !b.hidden),
      active = list.findIndex((b) => b.dataset.active === "true");
    list.forEach((b, i) => {
      const li = b.closest<HTMLElement>("li")!,
        target = i === 0 ? 0 : i === active || i - 1 === active ? 20 : -1;
      const spring = gaps.get(li) ?? new CriticalDamper(target);
      gaps.set(li, spring);
      const value = lowMotion()
        ? (spring.reset(target), target)
        : spring.step(target, 2 / Math.sqrt(200), dt);
      moving ||=
        Math.abs(value - target) > 0.002 || Math.abs(spring.velocity) > 0.02;
      li.style.marginLeft = `${value}px`;
      const stops = li.querySelectorAll<SVGStopElement>("stop");
      if (stops[0])
        stops[0].style.stopColor =
          list[i - 1]?.id ===
          (selectedPane()?.id === "settings"
            ? "settings-button"
            : selectedPane()?.id === "credits"
              ? "credits-button"
              : "")
            ? "var(--nav-selected)"
            : "var(--nav-body)";
      if (stops[1])
        stops[1].style.stopColor =
          b.dataset.active === "true"
            ? "var(--nav-selected)"
            : "var(--nav-body)";
      const left = navConnection(value, 40, 12, 20),
        next =
          i === list.length - 1
            ? 12
            : navConnection(
                gaps.get(list[i + 1]?.closest<HTMLElement>("li")!)?.value ?? -1,
                40,
                12,
                20,
              ).corner;
      li.style.borderRadius = `${i === 0 ? 12 : left.corner}px ${next}px ${next}px ${i === 0 ? 12 : left.corner}px`;
      li.querySelector("svg.gooey-neck")
        ?.querySelector("path")
        ?.setAttribute("d", i === 0 ? "" : left.path);
    });
    raf = moving ? requestAnimationFrame(animateNav) : 0;
  }
  menu(false);
  return {
    volume,
    brightness,
    updateNav,
    anyOpen: () => settings.open || credits.open || menuOpen,
    get brightnessValue() {
      return (
        Number(
          (document.querySelector("#brightness") as HTMLInputElement).value,
        ) / 100
      );
    },
    cancelGestures: () => {
      volume.cancel();
      brightness.cancel();
    },
    dispose() {
      cancelAnimationFrame(raf);
      volume.dispose();
      brightness.dispose();
      panes.forEach((p) => p.dispose());
      for (const pane of [settings, credits]) {
        pane.removeEventListener("focusin", updateNav);
        pane.removeEventListener("pointerdown", updateNav);
      }
    },
  };
}
