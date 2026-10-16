import { attachPortfolioPane } from "./portfolio-pane.mjs";
import { bindOwnedSlider } from "./slider";
/** One Settings surface, retaining the owned pane/slider/focus contracts. */
export function bindPortfolioControls(
  onOpen: () => void,
  onVolume: (value: number) => void,
  onPreferences: () => void,
) {
  const reduced = document.querySelector<HTMLInputElement>("#reduced")!,
    settings = document.querySelector<HTMLDialogElement>("#settings")!,
    trigger = document.querySelector<HTMLButtonElement>("#settings-button")!;
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
    onPreferences,
  );
  const updateNav = () => {
    onPreferences();
  };
  const pane = attachPortfolioPane(settings, {
    trigger,
    onOpen: () => {
      onOpen();
      onPreferences();
    },
    onClosed: updateNav,
    reduced: lowMotion,
    fallbackFocus: trigger,
  });
  settings.querySelector<HTMLButtonElement>(".pane-close")!.onclick = () => {
    volume.cancel();
    brightness.cancel();
    pane.close();
    onPreferences();
  };
  const change = () => {
    volume.cancel();
    brightness.cancel();
    onPreferences();
  };
  reduced.addEventListener("change", change);
  return {
    volume,
    brightness,
    updateNav,
    close: () => pane.close(),
    anyOpen: () => settings.open,
    get brightnessValue() {
      return (
        Number(document.querySelector<HTMLInputElement>("#brightness")!.value) /
        100
      );
    },
    cancelGestures() {
      volume.cancel();
      brightness.cancel();
    },
    dispose() {
      volume.dispose();
      brightness.dispose();
      pane.dispose();
      reduced.removeEventListener("change", change);
    },
  };
}
