# 🛡️ ReconBox - Serverless Security & OSINT Telegram Bot

ReconBox is an ephemeral, isolated, and highly scalable Telegram Bot built for Security Analysts and Bug Bounty Hunters. Powered by **Cloudflare Workers**, **D1 Database**, and the **Sandbox SDK**, it provides a zero-risk environment to execute security tools seamlessly from Telegram.

## ✨ Core Architecture & Features
- **Zero-Risk Execution:** Every scan spins up a fresh, isolated Ubuntu container (`@cloudflare/sandbox`).
- **Ephemeral Infrastructure:** Containers self-destruct immediately after execution to prevent malware persistence and memory leaks.
- **Concurrent Processing:** Runs multiple tools (`nmap`, `subfinder`, `httpx`, `whois`) perfectly in parallel.
- **Abuse Prevention:** Built-in rate limiting and a strict command whitelist mechanism via Cloudflare D1.
- **Crash-Proof UI:** Implements strict Telegram HTML escaping to prevent parse mode crashes.
