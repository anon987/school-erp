`NotoSans-Regular.ttf` is Google's Noto Sans, licensed under the SIL Open Font License 1.1
(Copyright 2010-2020 Google LLC). Bundled here (not fetched from a CDN at render time) because
`@react-pdf/renderer`'s default PDF base-14 fonts (Helvetica etc.) don't include the ₹ (Indian
Rupee, U+20B9) glyph -- receipts need it to render correctly, and PDF generation must not depend
on network access to a font CDN at request time. Full license text:
https://openfontlicense.org/open-font-license-official-text/
