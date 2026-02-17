function fmt(x) {
  return (x === null || x === undefined) ? "—" : x.toFixed(1);
}

function norm(x) {
  return (x ?? "").toString().trim().toLowerCase();
}

function rowKey(row) {
  // Key for overlap checks across tables
  return [
    norm(row.family),
    norm(row.model),
    norm(row.mode),
    norm(row.effort),
    row.shots ?? "",
    row.train_examples ?? "",
    norm(row.train_label),
    norm(row.cot)
  ].join("|");
}

function reasoningLabel(row) {
  if (row.mode === "baseline") return "—";

  // Manual CoT rows
  if (row.cot !== undefined && row.cot !== null) {
    return `Few-shot (${row.shots} shots, Manual CoT: ${row.cot})`;
  }

  if (row.mode === "fewshot") return `Few-shot (${row.shots} shots)`;
  if (row.mode === "reasoning") {
    return row.effort ? `Reasoning (Effort: ${row.effort})` : "Reasoning";
  }

  if (row.mode === "sft") {
    const label = row.train_label ?? row.train_examples ?? "Unknown";
    return `SFT (Train: ${label})`;
  }

  return "Non-reasoning";
}

function renderLeaderboard(rows, tbodyId) {
  const sorted = [...rows].sort((a, b) => {
    const aa = (a.acc === null || a.acc === undefined) ? -Infinity : a.acc;
    const bb = (b.acc === null || b.acc === undefined) ? -Infinity : b.acc;
    return bb - aa;
  });

  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";

  sorted.forEach((row, i) => {
    const tr = document.createElement("tr");

    const rank = document.createElement("td");
    rank.className = "has-text-right";
    rank.textContent = String(i + 1);

    const fam = document.createElement("td");
    fam.textContent = row.family;

    const model = document.createElement("td");
    model.textContent = row.model;

    const rcol = document.createElement("td");
    rcol.textContent = reasoningLabel(row);

    const f1f = document.createElement("td");
    f1f.className = "has-text-right";
    f1f.textContent = fmt(row.f1_f);

    const f1b = document.createElement("td");
    f1b.className = "has-text-right";
    f1b.textContent = fmt(row.f1_b);

    const acc = document.createElement("td");
    acc.className = "has-text-right";
    acc.textContent = (row.acc !== null && row.acc !== undefined)
      ? row.acc.toFixed(1)
      : "—";

    tr.append(rank, fam, model, rcol, f1f, f1b, acc);
    tbody.appendChild(tr);
  });
}

async function initLeaderboards() {
  const res = await fetch("./static/data/leaderboards.json");
  const data = await res.json();

  const zeroShot = data.zero_shot ?? [];

  // Ignore 0-shot few-shot rows (overlap with zero-shot)
  const fewShot = (data.few_shot ?? []).filter(r => Number(r.shots) !== 0);

  // Reasoning effort: remove overlaps already present in zero-shot (e.g., medium)
  const zeroKeys = new Set(zeroShot.map(rowKey));
  const reasoningEffort = (data.reasoning_effort ?? []).filter(r => !zeroKeys.has(rowKey(r)));

  const cotManual = data.cot_manual ?? [];
  const sft = data.sft ?? [];

  const allRows = [
    ...zeroShot,
    ...fewShot,
    ...reasoningEffort,
    ...cotManual,
    ...sft
  ];

  renderLeaderboard(allRows, "lb-all");
}

document.addEventListener("DOMContentLoaded", initLeaderboards);
