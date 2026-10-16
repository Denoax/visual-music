// Original vanilla adapter using the inspected owned portfolio's 140/160 ms
// pane timings, measured anchoring and focus-return rule.
// Use the copied Close SVG and scoped portfolio styles. No transport mutations.
let activationSequence = 0;
export function attachPortfolioPane(
  dialog,
  {
    trigger,
    onOpen = () => {},
    onClosed = () => {},
    reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    width = 380,
    fallbackFocus = null,
  } = {},
) {
  let state = "closed",
    animation = null,
    epoch = 0,
    origin = null;
  const originalZ = dialog.style.zIndex;
  function activate() {
    dialog.dataset.paneOrder = String(++activationSequence);
    const panes = [
      ...document.querySelectorAll("dialog[open][data-pane-order]"),
    ].sort((a, b) => Number(a.dataset.paneOrder) - Number(b.dataset.paneOrder));
    panes.forEach((pane, i) => {
      pane.style.zIndex = String(20 + i);
    });
  }
  function place() {
    const pad = 16,
      r = trigger.getBoundingClientRect(),
      w = Math.min(width, innerWidth - 2 * pad);
    const h = Math.min(dialog.scrollHeight || 448, innerHeight - 2 * pad);
    dialog.style.width = w + "px";
    dialog.style.maxHeight = innerHeight - 2 * pad + "px";
    dialog.style.left =
      Math.max(pad, Math.min(innerWidth - w - pad, r.right - w)) + "px";
    dialog.style.top =
      Math.max(pad, Math.min(innerHeight - h - pad, r.bottom + 12)) + "px";
  }
  function open() {
    if (state === "open" || state === "opening") return;
    const interrupted = state === "closing",
      style = interrupted ? getComputedStyle(dialog) : null;
    const from = style
      ? { opacity: style.opacity, transform: style.transform }
      : { opacity: 0, transform: "translateY(12px)" };
    const token = ++epoch;
    if (state === "closed") origin = document.activeElement;
    state = "opening";
    animation?.cancel();
    if (!dialog.open) dialog.show();
    activate();
    dialog.setAttribute("aria-modal", "false");
    trigger.setAttribute("aria-expanded", "true");
    place();
    onOpen();
    dialog.querySelector(".pane-close")?.focus({ preventScroll: true });
    animation = dialog.animate(
      [from, { opacity: 1, transform: "translateY(0)" }],
      {
        duration: reduced() ? 0 : 140,
        easing: "cubic-bezier(.2,.7,.2,1)",
        fill: "forwards",
      },
    );
    animation.finished
      .then(() => {
        if (token === epoch) state = "open";
      })
      .catch(() => {});
  }
  function close() {
    if (state === "closed" || state === "closing") return;
    const token = ++epoch,
      style = getComputedStyle(dialog),
      from = { opacity: style.opacity, transform: style.transform };
    state = "closing";
    animation?.cancel();
    animation = dialog.animate(
      [from, { opacity: 0, transform: "translateY(8px)" }],
      { duration: reduced() ? 0 : 160, easing: "ease-out", fill: "forwards" },
    );
    animation.finished
      .then(() => {
        if (token !== epoch) return;
        const restore = dialog.contains(document.activeElement);
        dialog.close();
        delete dialog.dataset.paneOrder;
        dialog.style.zIndex = originalZ;
        state = "closed";
        trigger.setAttribute("aria-expanded", "false");
        if (restore) {
          const target =
            origin instanceof HTMLElement &&
            origin.isConnected &&
            origin.getClientRects().length &&
            !origin.closest("[inert]")
              ? origin
              : fallbackFocus;
          target?.focus({ preventScroll: true });
        }
        onClosed();
      })
      .catch(() => {});
  }
  const toggle = () =>
    state === "closed" || state === "closing" ? open() : close();
  const escape = (e) => {
    if (
      e.key !== "Escape" ||
      !dialog.open ||
      e.defaultPrevented ||
      document.querySelector("dialog:modal")
    )
      return;
    const top = [
      ...document.querySelectorAll("dialog[open][data-pane-order]"),
    ].sort(
      (a, b) => Number(b.dataset.paneOrder) - Number(a.dataset.paneOrder),
    )[0];
    if (top === dialog) {
      e.preventDefault();
      close();
    }
  };
  const cancel = (e) => {
    e.preventDefault();
    close();
  };
  trigger.addEventListener("click", toggle);
  dialog.addEventListener("cancel", cancel);
  dialog.addEventListener("focusin", activate);
  dialog.addEventListener("pointerdown", activate);
  document.addEventListener("keydown", escape);
  window.addEventListener("resize", place);
  return {
    open,
    close,
    get state() {
      return state;
    },
    dispose() {
      ++epoch;
      animation?.cancel();
      if (dialog.open) dialog.close();
      delete dialog.dataset.paneOrder;
      dialog.style.zIndex = originalZ;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeEventListener("click", toggle);
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("focusin", activate);
      dialog.removeEventListener("pointerdown", activate);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", place);
    },
  };
}
