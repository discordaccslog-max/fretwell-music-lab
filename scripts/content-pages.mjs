// Copy for the informational and policy pages. {{r}} is replaced with the relative path to the site root.

export const LAST_UPDATED = 'November 8, 2026';
export const UPDATED_NOV_11 = { label: 'November 11, 2026', iso: '2026-11-11' };

export const FAQ = [
  ['How do license keys work?', `<p>When you buy a tool, the order confirmation page shows your license key straight away. It looks like <code class="key-sample">FRET-ET-7KQ4M-X9D2P-H6TR</code>. Enter it on the <a href="{{r}}unlock/">unlock page</a> and the tool opens in your practice room. The key is checked in your browser — there is no account, password or sign-in.</p>`],
  ['What do I receive after I buy, and how?', `<p>You receive a license key, delivered instantly on screen. As soon as your payment is complete, our payment provider returns you to your order confirmation page, which shows your key, the product name, the date and time and, when the payment provider supplies one, your order reference. You can copy the key, save the confirmation as a text file or print it. Enter the key on the <a href="{{r}}unlock/">unlock page</a> and your tools open in your practice room, in your browser. Nothing is shipped and there is nothing you need to download. See the <a href="{{r}}delivery/">Delivery Policy</a> for every step.</p>`],
  ['Where do I enter my key?', `<p>On the <a href="{{r}}unlock/">unlock page</a>, which you can reach from the “Have a key?” link at the top of every page. Inside the practice room you can also add more keys from the “Add a key” section.</p>`],
  ['How should I save my key?', `<p>Copy it into a notes app or password manager, or use the “Save as text file” button on the confirmation page. Keep it somewhere you can find it later; you will need it to open your tools on another device or browser.</p>`],
  ['Can I use it on more than one device?', `<p>Yes. Enter the same key on each of your devices — your computer, tablet and phone. Each device remembers the key after you enter it once. Keys are for your own personal use, so please don’t share them.</p>`],
  ['How do I move my progress to another device?', `<p>Progress, stats and settings are stored only in the browser you practise in. To move them, open the practice room’s Progress page and choose “Export progress”. You can copy a backup code or save a small file. On the other device, enter your key, then choose “Import progress” and paste the code or open the file.</p>`],
  ['Does it work offline?', `<p>Yes. Once you have unlocked your tools and opened the practice room while online, it is stored on your device and keeps working without an internet connection. You can also install it to your home screen or desktop like an app, using your browser’s “Install” or “Add to Home Screen” option.</p>`],
  ['What devices and browsers are supported?', `<p>Recent versions of Chrome, Edge, Firefox and Safari on computers, tablets and phones, including iPhone and iPad. You need speakers or headphones. On phones the piano keyboard and fretboard scroll sideways so they stay a comfortable size.</p>`],
  ['Are the sounds recordings of real instruments?', `<p>No. Every sound — the plucked guitar tone, the keyboard tone and the metronome click — is synthesized in your browser as you play. They are designed to sound pleasant and clear, but they are not recordings of real instruments.</p>`],
  ['Which tool should I start with?', `<p>If you are still learning note names, start with <a href="{{r}}products/note-reader/">Note Reader</a>. If you want to train your ear, start with the <a href="{{r}}products/interval-trainer/">Interval Ear Trainer</a>. For theory you can apply on guitar or piano straight away, try the <a href="{{r}}products/scale-explorer/">Scale &amp; Mode Explorer</a> or <a href="{{r}}products/chord-builder/">Chord Builder</a>. Every product page has a short demo and the home page has a free mini quiz, so you can get a feel for the tools before you buy.</p>`],
  ['What is the difference between Foundations and Studio Editions?', `<p>Foundations tools cover the essentials: reading notes, intervals, scales, chords and rhythm. Studio Editions go further, with harder material (such as extended chords and compound intervals), written exercises that are checked against rules (such as four-part harmony and melodic dictation) and multi-voice dictation. Each product page explains exactly what its exercises involve.</p>`],
  ['Does it follow a specific exam syllabus?', `<p>No. The tools follow widely used theory conventions and are not designed around any exam or syllabus. Terms and conventions vary between teaching traditions, so check with your teacher if you are preparing for something specific.</p>`],
  ['Can teachers and schools use it?', `<p>Each key is licensed for one person’s own practice. If you are a teacher or school and would like to use the tools with students, contact us through the <a href="{{r}}contact/">Contact page</a> to ask about a classroom license.</p>`],
  ['What if I lose my key?', `<p>Contact us through the <a href="{{r}}contact/">Contact page</a> with your order number and the email address you used at checkout, and we will send you a replacement key. Devices where you have already entered your key stay unlocked.</p>`],
  ['Can I get a refund?', `<p>Yes. You can get a full refund on any purchase within 14 days, with no reason needed. Contact us through the <a href="{{r}}contact/">Contact page</a> with your order number. See the <a href="{{r}}refunds/">Refund Policy</a> for details.</p>`],
  ['Is it a subscription?', `<p>No. Each product is a one-time purchase. There are no recurring charges.</p>`],
  ['Do I need an account?', `<p>No. There is no account and no password. Your key unlocks your tools, and everything else stays in your browser.</p>`],
];

export const ABOUT = `
<p class="lede">Fretwell Music Lab makes interactive music theory and ear-training tools for guitar and piano players. They run in a web browser on a computer, tablet or phone.</p>
<h2>What we make</h2>
<p>Each tool focuses on one part of musicianship — reading notes, hearing intervals, knowing scales and chords, feeling rhythm, understanding harmony — and turns it into short, repeatable practice with immediate feedback. Exercises are generated from music theory rules, so you never run out of new questions and never practise the same fixed list until you have memorised it.</p>
<p>The tools show the same idea in several ways at once: on the staff, on a guitar fretboard, on a piano keyboard and by ear. Seeing a chord on the keyboard, hearing it, and finding it on the neck all reinforce each other.</p>
<h2>Why we make it this way</h2>
<p>Theory and ear training are easier to practise little and often, and harder to fit in when they need books, apps that ask for an account, or a teacher sitting beside you. We wanted tools that open instantly, work offline once installed, and keep your progress private on your own device.</p>
<ul>
  <li><strong>Everything is generated.</strong> Questions, melodies and progressions are built from theory rules each time, and checked by automated tests for correct spelling, Roman numerals and voice leading.</li>
  <li><strong>Everything is synthesized.</strong> Guitar, keyboard and metronome sounds are created in your browser rather than played from recordings.</li>
  <li><strong>Nothing is tracked.</strong> No cookies, no analytics, no accounts. Your keys, progress and settings stay on your device.</li>
  <li><strong>No borrowed music.</strong> There are no songs, lyrics or sheet music from anyone else anywhere in the tools.</li>
</ul>
<h2>What the tools are not</h2>
<p>They are practice aids, not lessons, and they don’t replace a teacher. They describe and drill what each topic involves; how far you get depends on how you practise. See the <a href="{{r}}disclaimer/">Disclaimer</a> for more.</p>
<p>Questions? Get in touch through the <a href="{{r}}contact/">Contact page</a>.</p>
`;

export const REFUNDS = `
<p>We want you to be happy with what you buy. If you are not, you can have your money back.</p>
<h2>14-day refunds, no reason needed</h2>
<p>You can get a full refund on any purchase if you ask within 14 days of buying it. You don’t need to give a reason.</p>
<h2>How to ask for a refund</h2>
<p>Contact us through the <a href="{{r}}contact/">Contact page</a> and include your order number. Including the email address you used at checkout helps us find your order quickly.</p>
<h2>When you will get your money</h2>
<p>Refunds go back to your original payment method. We issue them within 5 business days of your request. Your payment provider or bank may then take a few more days to show the money in your account.</p>
<h2>After a refund</h2>
<p>A refunded license key is no longer licensed for use. Please remove it from your devices with the “Sign out on this device” button in the practice room.</p>
<h2>Customers in the EU and UK</h2>
<p>Consumers in the European Union and the United Kingdom have a legal right to cancel online purchases within 14 days. For digital content that is made available straight away, that right can end once access begins, if you agreed to this at checkout. Whatever the law allows, our policy above still applies: you can have a full refund for any reason within 14 days of purchase.</p>
<h2>Your legal rights</h2>
<p>This policy does not limit any rights you have under consumer protection law, for example if a product is faulty or not as described.</p>
`;

export const DELIVERY = `
<p>All Fretwell Music Lab products are digital: online music-training tools that you unlock with a license key. There is no physical shipment, and nothing is posted to you.</p>
<h2>How delivery works, step by step</h2>
<ol>
  <li><strong>You agree and pay.</strong> On the product page you tick the box agreeing to the <a href="{{r}}terms/">Terms of Service</a> and <a href="{{r}}refunds/">Refund Policy</a>, then complete payment on our payment provider’s secure checkout.</li>
  <li><strong>You return to your order confirmation page.</strong> As soon as your payment is complete, the payment provider sends you to that product’s order confirmation page on this site.</li>
  <li><strong>Your license key appears immediately.</strong> The confirmation page creates your license key in your browser and shows it straight away, together with the product name, the date and time and, when the payment provider supplies one, your order reference.</li>
  <li><strong>You save your key.</strong> Copy the key, use “Save confirmation” to download a text file containing your order details and key, or print the page.</li>
  <li><strong>You unlock your tools.</strong> Select “Open my tools”, or go to the <a href="{{r}}unlock/">unlock page</a> (also reachable from the “Have a key?” link at the top of every page), and enter your key. Your tools open right away in your practice room, in your web browser.</li>
</ol>
<h2>When delivery happens</h2>
<p>Delivery is immediate: your key is shown within seconds of your payment being completed, on the page the payment provider returns you to. The key is not posted or emailed by us, so save it from the confirmation page.</p>
<h2>Using your key on more devices</h2>
<p>You can enter the same key on any of your own devices — computer, tablet or phone. Each device remembers your key once entered, and you can install the practice room to keep working offline.</p>
<h2>What you need</h2>
<p>A recent web browser on a computer, tablet or phone, and speakers or headphones. An internet connection is needed to unlock your tools and load them the first time; after that they keep working offline.</p>
<h2>If you lose your key or the page closes</h2>
<p>Get in touch through the <a href="{{r}}contact/">Contact page</a> with your order number and we will send you a replacement key in our reply. The same applies if the confirmation page closed before you could save your key.</p>
<h2>How long access lasts</h2>
<p>Online access continues for as long as Fretwell Music Lab operates. Tools you have installed and opened on a device keep working on that device without an internet connection.</p>
`;

export const DISCLAIMER = `
<h2>Practice aids, not lessons</h2>
<p>Fretwell Music Lab tools are practice aids for music theory and ear training. They are not lessons, and they don’t replace a teacher.</p>
<h2>No promised results</h2>
<p>Progress depends on how often you practise, where you start, and other individual factors. We describe what each tool trains, but we don’t promise any specific result.</p>
<h2>Theory conventions</h2>
<p>Music theory terms and conventions vary between teaching traditions — for example in Roman numeral symbols, voice-leading rules and solfège. The tools follow widely used conventions, which may differ from those you have been taught.</p>
<h2>Volume</h2>
<p>Keep the volume at a comfortable level, especially when using headphones. Start low and turn it up gradually.</p>
<h2>Synthesized sounds</h2>
<p>All instrument sounds are synthesized in your browser. They are not recordings of real instruments, and they will not sound exactly like any particular instrument.</p>
<h2>Independence</h2>
<p>Fretwell Music Lab is independent. It is not affiliated with or endorsed by any music school, exam board, instrument maker or software company.</p>
`;

export const TERMS = `
<p>These terms apply when you use this website or buy and use Fretwell Music Lab products. Please read them before you buy.</p>
<h2>1. Accepting these terms</h2>
<p>By using this website or buying a product, you agree to these terms. If you don’t agree, please don’t use the site or buy products.</p>
<h2>2. What the products are</h2>
<p>Fretwell Music Lab products are online music training tools that run in your web browser. Each product is unlocked with a license key. The product pages describe what each tool includes and what you need to use it.</p>
<h2>3. Your license</h2>
<p>When you buy a product, you receive a personal, non-exclusive license to use it for your own practice. You may use your key on any number of your own devices.</p>
<p>Each key is for your personal use only. You may not share, publish, sell or transfer your key, or make the tools available to other people.</p>
<h2>4. Teachers and schools</h2>
<p>If you would like to use the tools with students or in a classroom, contact us through the <a href="{{r}}contact/">Contact page</a> to ask about a classroom license.</p>
<h2>5. Prices, taxes and payment</h2>
<p>Prices are shown in US dollars on each product page. Each product is a one-time purchase, not a subscription. Payment is handled by our third-party payment provider at checkout. Applicable taxes are calculated and shown at checkout before you pay, according to your location.</p>
<h2>6. Agreeing before you buy</h2>
<p>Before you can continue to checkout, you must tick the box on the product page confirming that you agree to these Terms of Service and our <a href="{{r}}refunds/">Refund Policy</a>. The buy button stays inactive until you do. By completing a purchase, you confirm that you have read and agree to both.</p>
<h2>7. Delivery</h2>
<p>Products are delivered digitally as described in our <a href="{{r}}delivery/">Delivery Policy</a>.</p>
<h2>8. Refunds</h2>
<p>Refunds are available as described in our <a href="{{r}}refunds/">Refund Policy</a>.</p>
<h2>9. Ownership</h2>
<p>All software, exercises, sounds, designs and site content are owned by Fretwell Music Lab. Your license lets you use the tools; it doesn’t transfer ownership of them. You may not copy, modify, redistribute or resell the software or content, except as the law allows.</p>
<h2>10. Acceptable use</h2>
<p>Please don’t try to get around the license key system, interfere with the site, or use it in a way that breaks the law.</p>
<h2>11. Warranties</h2>
<p>We work to keep the tools accurate and working well. To the extent permitted by law, the site and products are provided “as is”, without warranties of any kind, whether express or implied, including warranties of fitness for a particular purpose.</p>
<h2>12. Limitation of liability</h2>
<p>To the extent permitted by law, Fretwell Music Lab’s total liability to you for any claim relating to the site or a product is limited to the amount you paid for that product.</p>
<h2>13. Your statutory rights</h2>
<p>Nothing in these terms limits rights you have under consumer protection law that cannot be excluded or limited, including any rights you have where digital content is faulty or not as described.</p>
<h2>14. Changes to these terms</h2>
<p>We may update these terms from time to time. When we do, we will post the new version on this page and change the date at the top. The terms in force when you made a purchase apply to that purchase.</p>
<h2>15. Contact</h2>
<p>Questions about these terms? Contact us through the <a href="{{r}}contact/">Contact page</a>.</p>
`;

export const PRIVACY = `
<p>Fretwell Music Lab is built to collect as little as possible. This policy explains what information exists, where it is kept and what your rights are.</p>
<h2>The short version</h2>
<ul>
  <li>The site uses no cookies, no analytics and no advertising trackers.</li>
  <li>The site never accesses your microphone or camera.</li>
  <li>Your license keys, progress, stats and settings are stored only in your own browser and are never sent anywhere.</li>
  <li>Payments are handled by a third-party payment provider. We never see your full card details.</li>
  <li>We never sell your personal information or share it for advertising.</li>
</ul>
<h2>Information stored on your device</h2>
<p>To make the tools work, your browser stores your license keys, practice progress, stats, settings, saved practice sets, and display preferences such as dark mode and volume. This information stays in your browser’s local storage on your device. We cannot see it and it is never sent to us or anyone else. Because this storage is only used to provide the features you ask for, no consent banner is needed.</p>
<p>You can delete it at any time: use “Sign out on this device” and “Delete all progress” in the practice room, or clear this site’s data in your browser settings. If you export a progress backup, the backup code or file is created on your device and goes wherever you choose to put it.</p>
<h2>Fonts and hosting</h2>
<p>When you visit a page, your browser loads fonts from Google Fonts. As with any request to a web server, Google receives technical information such as your IP address and browser type when the fonts are delivered; Google’s own privacy policy applies to that. {{hosting}}</p>
<h2>Payments</h2>
<p>When you buy a product, payment is handled by a third-party payment provider, which collects your payment details under its own privacy policy. Fretwell Music Lab never sees or stores your full card details.</p>
<h2>Order information we receive</h2>
<p>From the payment provider we receive order information: your name, email address, the products you bought and your country. We use it only to:</p>
<ul>
  <li>provide support, including sending replacement keys;</li>
  <li>process refunds; and</li>
  <li>meet our tax and accounting obligations.</li>
</ul>
<p>If you write to us, we use your message and email address to reply and to keep a record of the conversation.</p>
<h2>Legal basis (EU and UK)</h2>
<p>We use order information to perform our contract with you (providing your product and support), to comply with legal obligations (tax and accounting records), and, for keeping support records, on the basis of our legitimate interest in being able to help you consistently.</p>
<h2>Sharing</h2>
<p>We never sell your personal information and never share it for advertising or cross-context behavioural advertising. Order information is held by the payment provider that processed your purchase, and may be processed in other countries under that provider’s safeguards.</p>
<h2>How long we keep information</h2>
<p>We keep order information for as long as we need it to provide support and process refunds, and for as long as tax and accounting laws require us to keep records. After that it is deleted. Support emails are kept only as long as needed for these purposes.</p>
<h2>Your rights</h2>
<p>Depending on where you live — including under the EU and UK General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA) — you have the right to:</p>
<ul>
  <li><strong>Access</strong> the personal information we hold about you;</li>
  <li><strong>Correct</strong> information that is wrong;</li>
  <li><strong>Delete</strong> your information, subject to records we must keep by law;</li>
  <li><strong>Object</strong> to or ask us to restrict how we use it; and</li>
  <li>receive a copy of it in a portable format.</li>
</ul>
<p>To use any of these rights, contact us through the <a href="{{r}}contact/">Contact page</a>. We will not treat you differently for using them. If you are in the EU or UK and are unhappy with how we handle your information, you can also complain to your local data protection authority.</p>
<h2>Children</h2>
<p>The site is not directed at children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has given us personal information, contact us and we will delete it.</p>
<h2>Changes to this policy</h2>
<p>If we change this policy, we will post the updated version on this page and change the “Last updated” date at the top. Significant changes will be summarised at the top of the page.</p>
<h2>Contact</h2>
<p>For privacy questions or requests, contact us through the <a href="{{r}}contact/">Contact page</a>.</p>
`;

export const ACCESSIBILITY = `
<p>We want Fretwell Music Lab to be usable by as many people as possible. This page describes what the site and practice room do to support that, and where the limits are.</p>
<h2>What is built in</h2>
<ul>
  <li><strong>Keyboard operation.</strong> Everything can be used with a keyboard. The fretboard and piano keyboard are moved with the arrow keys and played with Enter or Space.</li>
  <li><strong>Shortcuts.</strong> Each tool has shortcuts for answering (number keys), replaying (R) and moving on (Enter). Press ? in a tool to see them.</li>
  <li><strong>Visible focus.</strong> The focused control always has a clear outline.</li>
  <li><strong>Contrast.</strong> Text and controls are designed to meet WCAG AA contrast in both light and dark mode.</li>
  <li><strong>Larger interface.</strong> The practice room has a setting that enlarges text and controls.</li>
  <li><strong>Not colour alone.</strong> Correct and incorrect answers are shown with ✓ and ✗ icons and text as well as colour.</li>
  <li><strong>Reduced motion.</strong> If your device is set to reduce motion, animations are turned off.</li>
  <li><strong>Dark mode.</strong> Follows your device setting, with a switch in the header.</li>
</ul>
<h2>Known limitations</h2>
<ul>
  <li>The Interval Ear Trainer, Melodic Dictation Studio, Atelier Edition and the ear-training parts of other tools require being able to hear audio.</li>
  <li>Music notation is visual. Notes are described in text where possible, but some exercises, such as writing on the staff, depend on seeing the staff.</li>
  <li>Rhythm exercises measure tapping precision, which may not suit everyone.</li>
</ul>
<h2>Feedback</h2>
<p>If something is hard to use, please tell us through the <a href="{{r}}contact/">Contact page</a> so we can improve it.</p>
`;
