# Closing Cost Estimator — The Bull Brew

Free web app for first-time home buyers: enter home price, down payment, loan
type, and state — get a full line-item closing cost breakdown and total cash
to close, with every line explained in plain English.

- Static app (no build step): `docs/index.html` + `docs/styles.css` + `docs/app.js`
- Local-first: inputs persist in localStorage; offline via service worker
- State-adjusted transfer taxes and property-tax escrow estimates (~10 states + national average)
- Loan types: conventional, FHA (1.75% UFMIP financed), VA (2.15% funding fee financed)

Live: https://thebullbrew.github.io/closing-cost-estimator/
