# VCMS Frontend (Registration + Appointments)
React + Vite. Runs standalone on a localStorage mock (`src/api.js`); switch to the real backend by implementing each `api.*` method with `fetch('/api/...')` (Vite proxies /api to :4000).

    npm install && npm run dev

Demo flow: register client (use phone 9820011111 to see REG-3 duplicate warning) -> merge -> book -> double-book blocked -> owner request -> confirm -> check in -> cancel with reason -> activity log.
Requirement IDs are noted in comments in api.js.
