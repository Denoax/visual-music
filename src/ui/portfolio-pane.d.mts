export function attachPortfolioPane(
  dialog: HTMLDialogElement,
  options: {
    trigger: HTMLElement;
    onOpen?: () => void;
    onClosed?: () => void;
    reduced?: () => boolean;
    width?: number;
    fallbackFocus?: HTMLElement;
  },
): { open(): void; close(): void; readonly state: string; dispose(): void };
