"use strict";
/* Closing Cost Estimator — The Bull Brew. Local-first, no backend. */

const STATES = {
  NJ:    { name: "New Jersey",       transfer: 1.00, propTax: 2.40, note: "NJ realty transfer fee ≈1% of price; property taxes among the nation's highest." },
  NY:    { name: "New York",         transfer: 0.40, propTax: 1.70, note: "State transfer tax 0.4%. NYC adds its own transfer tax (1–1.425%) — not included here." },
  PA:    { name: "Pennsylvania",     transfer: 2.00, propTax: 1.60, note: "PA transfer tax is typically 2% total — 1% state plus 1% local." },
  FL:    { name: "Florida",          transfer: 0.70, propTax: 1.10, note: "FL doc stamps run $0.70 per $100 of price. No state income tax." },
  TX:    { name: "Texas",            transfer: 0.00, propTax: 1.80, note: "Texas has no transfer tax — but property taxes are steep." },
  CA:    { name: "California",       transfer: 0.11, propTax: 0.75, note: "CA transfer tax is $1.10 per $1,000. Prop 13 keeps assessed values (and taxes) low." },
  GA:    { name: "Georgia",          transfer: 0.10, propTax: 0.90, note: "GA transfer tax is $1 per $1,000 of price." },
  NC:    { name: "North Carolina",   transfer: 0.20, propTax: 0.85, note: "NC excise tax is $2 per $1,000 of price." },
  OH:    { name: "Ohio",            transfer: 0.40, propTax: 1.60, note: "OH conveyance fee ≈$4 per $1,000 in most counties." },
  VA:    { name: "Virginia",         transfer: 0.35, propTax: 0.85, note: "VA combines grantor and recordation taxes — ≈0.35% is a working average." },
  OTHER: { name: "Other / national avg", transfer: 0.50, propTax: 1.10, note: "National-average placeholders. Your state and county will differ." }
};

const LOAN_NOTES = {
  conv: "Conventional loan. Putting down less than 20%? Expect monthly PMI until you reach 20% equity — that's a monthly cost, not part of cash to close.",
  fha:  "FHA loan: 3.5% minimum down. The 1.75% upfront mortgage insurance premium is usually financed into the loan (shown below), not paid in cash.",
  va:   "VA loan: 0% down allowed for eligible veterans. The 2.15% first-use funding fee is usually financed into the loan (shown below), not paid in cash."
};

const $ = id => document.getElementById(id);
const fmt = n => "$" + Math.round(n).toLocaleString("en-US");
const KEY = "cce-inputs-v1";

function readInputs() {
  return {
    price:   Math.max(0, +$("price").value || 0),
    downPct: +$("downPct").value,
    rate:    +$("rate").value,
    points:  +$("points").value,
    loanType:$("loanType").value,
    state:   $("state").value
  };
}

function line(name, amt, why) {
  return { name, amt, why };
}

function compute(inp) {
  const st = STATES[inp.state];
  const down = inp.price * inp.downPct / 100;
  const loan = Math.max(0, inp.price - down);

  const feeLines = [
    line("Loan origination fee", loan * 0.01,
      "The lender's charge for making the loan — typically about 1% of the loan amount. Some lenders discount it; some bake it into a higher rate."),
    line("Discount points", loan * inp.points / 100,
      "Optional upfront interest you buy to lower your rate. One point = 1% of the loan, and usually buys the rate down about 0.25%."),
    line("Appraisal", 450,
      "An independent appraiser confirms the home is worth what you're paying. The lender requires it — they won't lend more than the home's value."),
    line("Credit report", 75,
      "The fee for pulling your credit during underwriting. Small, but it's on every closing statement."),
    line("Title search", 300,
      "A search of public records to confirm the seller truly owns the home and no liens or claims are hiding in its history."),
    line("Lender's title insurance", loan * 0.0035,
      "A one-time policy protecting the lender if a title problem surfaces later. (An owner's policy for yourself is optional but wise.)"),
    line("Recording fees", 200,
      "What the county charges to stamp your deed and mortgage into the public record. Flat fee in most places."),
    line(`Transfer taxes (${st.name})`, inp.price * st.transfer / 100,
      `Taxes paid when ownership transfers — ${st.name} runs about ${st.transfer}%. ${st.note}`)
  ];

  const prepaidInterest = loan * (inp.rate / 100) / 365 * 15;
  const insAnnual = inp.price * 0.0035;
  const taxAnnual = inp.price * st.propTax / 100;

  const prepaidLines = [
    line("Prepaid interest (15 days)", prepaidInterest,
      `Interest from your closing day through month-end. We assume a mid-month closing — close early in the month and this shrinks.`),
    line("Homeowner's insurance escrow (2 mo)", insAnnual / 12 * 2,
      `The lender collects two months of homeowner's insurance upfront (est. ${fmt(insAnnual)}/yr) so the policy never lapses while they hold your loan.`),
    line(`Property tax escrow (3 mo)`, taxAnnual / 12 * 3,
      `Three months of property taxes collected upfront (est. ${fmt(taxAnnual)}/yr at ${st.propTax}% in ${st.name}). Your monthly payment then includes 1/12 of the annual bill.`)
  ];

  const downLines = [
    line(`Down payment (${inp.downPct}%)`, down,
      "Your skin in the game — paid at closing, not financed. Bigger down payment means a smaller loan and less interest over time.")
  ];

  const feesTotal = feeLines.reduce((s, l) => s + l.amt, 0);
  const prepaidTotal = prepaidLines.reduce((s, l) => s + l.amt, 0);
  const total = down + feesTotal + prepaidTotal;

  let financed = null;
  if (inp.loanType === "fha" && loan > 0)
    financed = { label: "FHA upfront MIP (financed, not cash due)", amt: loan * 0.0175,
      text: "1.75% of the loan is added to your loan balance instead of being paid at closing." };
  if (inp.loanType === "va" && loan > 0)
    financed = { label: "VA funding fee (financed, not cash due)", amt: loan * 0.0215,
      text: "2.15% first-use funding fee, added to your loan balance instead of being paid at closing." };

  return { downLines, feeLines, prepaidLines, financed, total, down, feesTotal, prepaidTotal, loan, st };
}

function renderLines(el, lines) {
  el.innerHTML = "";
  lines.forEach(l => {
    const div = document.createElement("div");
    div.className = "line";
    div.innerHTML = `<div class="line-top"><span class="line-name"></span><span class="line-amt"></span></div>
      <details class="line-why"><summary>What is this?</summary><p></p></details>`;
    div.querySelector(".line-name").textContent = l.name;
    div.querySelector(".line-amt").textContent = fmt(l.amt);
    div.querySelector(".line-why p").textContent = l.why;
    el.appendChild(div);
  });
}

function render() {
  const inp = readInputs();
  $("downPctOut").textContent = inp.downPct + "%";
  $("rateOut").textContent = inp.rate.toFixed(3).replace(/\.?0+$/, "") + "%";
  $("pointsOut").textContent = inp.points;
  $("loanNote").textContent = LOAN_NOTES[inp.loanType] || "";

  const r = compute(inp);
  renderLines($("downLines"), r.downLines);
  renderLines($("feeLines"), r.feeLines);
  renderLines($("prepaidLines"), r.prepaidLines);

  $("totalCash").textContent = fmt(r.total);
  $("totalSub").textContent =
    `${fmt(r.down)} down + ${fmt(r.feesTotal)} lender & title fees + ${fmt(r.prepaidTotal)} prepaids & escrows`;

  const fb = $("financedBox");
  if (r.financed) {
    fb.innerHTML = `<strong>${r.financed.label}: ${fmt(r.financed.amt)}</strong><br>${r.financed.text}`;
  } else fb.innerHTML = "";

  try { localStorage.setItem(KEY, JSON.stringify(inp)); } catch (e) {}
}

function restore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s) return;
    if (s.price != null) $("price").value = s.price;
    if (s.downPct != null) $("downPct").value = s.downPct;
    if (s.rate != null) $("rate").value = s.rate;
    if (s.points != null) $("points").value = s.points;
    if (s.loanType) $("loanType").value = s.loanType;
    if (s.state && STATES[s.state]) $("state").value = s.state;
  } catch (e) {}
}

["price","downPct","rate","points","loanType","state"].forEach(id => {
  $(id).addEventListener("input", render);
  $(id).addEventListener("change", render);
});
$("printBtn").addEventListener("click", () => window.print());
$("resetBtn").addEventListener("click", () => {
  $("price").value = 385000; $("downPct").value = 10; $("rate").value = 6.5;
  $("points").value = 0; $("loanType").value = "conv"; $("state").value = "NJ";
  try { localStorage.removeItem(KEY); } catch (e) {}
  render();
});

restore();
render();
