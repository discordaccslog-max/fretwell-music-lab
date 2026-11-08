// Product pages: mount the interactive demo for this product.
import { initSoundToggles } from '../core/sound-ui.js';

initSoundToggles();
const host = document.querySelector('[data-demo]');
if (host) {
  import('./demos.js').then((m) => m.mountDemo(host, host.getAttribute('data-demo'))).catch(() => {
    host.textContent = 'The demo could not load. Check your connection and refresh the page.';
  });
}
