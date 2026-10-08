# Kairo Sound — producer storefront

A responsive storefront for a music producer, built with React and Vite. Artists can preview and filter beats, make an account, request a license using mobile money or bank transfer, and see delivered downloads in their library. The studio console lets the producer manage beats, publish video clips, review orders and messages, and configure checkout details.

## Run locally

```bash
npm install
npm run dev
```

Vite serves the site on port `5173`. Create a production bundle with `npm run build`.

## Preview workspace

Open **Studio access** in the footer and use the demo passcode **`soundcheck`**. From the console you can upload audio (up to 45 MB), publish a video file or YouTube link (uploads up to 140 MB), review orders, confirm a payment, and edit the displayed payout details and currency.

Beats, videos, artist accounts, orders, messages and settings are stored in the current browser (`localStorage` and IndexedDB). Uploaded media and demo orders are not shared between browsers or devices.

## Important before launch

This is a front-end preview, not a live payment or email service:

- Mobile money and bank checkout currently creates a **pending order**. The producer verifies a transfer outside the site and marks it delivered in Studio.
- Confirming an order unlocks its local download and records a demo receipt in the Studio email log. It does not send an email.
- Artist credentials and studio access are only suitable for demonstrating the UI. The demo studio passcode is visible in the client bundle.

For production, add a server-side database and authentication, private object storage for beat/video files, a payment provider that supports the producer's region and mobile-money networks, server-side payment verification, and a transactional email service. Keep API keys and admin credentials on the server; do not use this browser-only preview to collect real payments or sensitive payout information.
