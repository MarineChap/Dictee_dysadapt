import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom ships <dialog> without its modal behaviour, so ConfirmDialog and
// RenameDialog would throw the moment they open. Just enough of it to render.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
