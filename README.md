# DFIN

> A minimalist, offline-first task scheduler and real-time session execution suite.

DFIN bridges the gap between rigid planning (the Schedule) and fluid reality (the Session). Built with a decoupled time-anchor architecture, it syncs peer-to-peer without relying on centralized cloud servers.

## ⚡ Tech Stack
* **Frontend:** Svelte 5 (Runes) + Tailwind CSS
* **Backend Framework:** Tauri v2
* **Local Data & Sync:** RxDB (SQLite) + Yjs (CRDT)
* **Networking:** Rust mDNS + WebSockets (BLE Fallback)

## 🚀 Key Architecture
* **The $T_0$ Anchor:** Dynamically maps rigid schedule blocks to the exact moment a session begins.
* **Floating Session Widget:** Detached active countdown timer with a built-in "Distraction Dump."
* **P2P Sync:** Zero-data-loss synchronization via local network or Bluetooth.

## 🛠️ Local Development Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v22+)
* [Rust](https://rustup.rs/) (v1.96+)
* Android Studio (SDK/NDK for mobile builds)

### Installation
1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/dfin.git
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Run the development server (Desktop):
   \`\`\`bash
   npm run tauri dev
   \`\`\`