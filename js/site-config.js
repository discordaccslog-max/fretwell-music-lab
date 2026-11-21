// Fretwell Music Lab — site configuration.
//
// supportEmail: the address buyers write to for help.
// While it is empty, the email line is left out of the Contact page and footer,
// and the "Report a problem" link in each tool stays hidden.
// Example: supportEmail: 'help@your-domain.example'
//
// checkoutUrl: the address of your checkout page for the cart (it can be a page on this site, such as
// 'checkout/', or a full https:// address). While it is empty, the cart page shows no checkout button.
// A checkout page on this site can read the cart with cartLines() and cartTotal() from js/cart.js.

export const SITE_CONFIG = {
  supportEmail: 'fretwellmail@fretwellmusic.live',
  checkoutUrl: '',
};
