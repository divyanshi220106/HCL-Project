/* app.js - user interface: input handling, animations, results, weights, comparison. */
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),
  sl = (ms) => new Promise((r) => setTimeout(r, ms));
const parse = () => parseResumes($("#res").value);
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("on");
  setTimeout(() => t.classList.remove("on"), 2200);
}
function reqs() {
  const t = $("#jd").value,
    s = skills(t),
    y = yrs(t),
    e = edu(t);
  $("#req").innerHTML =
    (s.length
      ? s.map((k) => `<span class="chip">${esc(lab(k))}</span>`).join("")
      : '<span class="sub" style="margin:0">No skills detected yet.</span>') +
    (y ? `<span class="chip">${y}+ years</span>` : "") +
    (e ? `<span class="chip">${EDU[e]}</span>` : "");
}
function cnt() {
  const n = parse().length;
  $("#cnt").textContent = n ? n + " resume" + (n > 1 ? "s" : "") + " loaded" : "";
}
function load() {
  $("#jd").value = SAMPLE_JD;
  $("#res").value = SAMPLE_RES;
  reqs();
  cnt();
}
$("#jd").oninput = reqs;
$("#res").oninput = cnt;
$("#smp").onclick = load;
$("#clr").onclick = () => {
  $("#jd").value = "";
  $("#res").value = "";
  reqs();
  cnt();
};
async function pdfText(f) {
  if (window.pdfjsLib)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const d = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
  let o = "";
  for (let i = 1; i <= d.numPages; i++) {
    const c = await (await d.getPage(i)).getTextContent();
    o += c.items.map((x) => x.str).join(" ") + "\n";
  }
  return o;
}
async function addFiles(fl) {
  let n = 0;
  for (const f of fl) {
    try {
      let t = (/\.pdf$/i.test(f.name) ? await pdfText(f) : await f.text()).trim();
      if (!t) throw 0;
      const nm =
        f.name
          .replace(/\.\w+$/, "")
          .replace(/[_-]+/g, " ")
          .replace(/\b(resume|cv)\b/gi, "")
          .trim() || "Candidate";
      const r = $("#res");
      r.value = (r.value.trim() ? r.value.trim() + "\n---\n" : "") + nm + "\n" + t;
      n++;
    } catch (e) {
      toast("Could not read " + f.name);
    }
  }
  cnt();
  if (n) toast(n + " resume(s) added");
}
$("#f").onchange = async (e) => {
  await addFiles(e.target.files);
  e.target.value = "";
};
const dz = $("#dz");
["dragenter", "dragover"].forEach((v) =>
  dz.addEventListener(v, (e) => {
    e.preventDefault();
    dz.classList.add("on");
  }),
);
["dragleave", "drop"].forEach((v) =>
  dz.addEventListener(v, (e) => {
    e.preventDefault();
    dz.classList.remove("on");
  }),
);
dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
$("#tg").onclick = () => {
  const d = document.documentElement,
    dk = d.dataset.theme
      ? d.dataset.theme == "dark"
      : matchMedia("(prefers-color-scheme:dark)").matches;
  d.dataset.theme = dk ? "light" : "dark";
};
const STEPS = [
  "Parsing resumes",
  "Extracting skills and education",
  "Building TF-IDF vectors",
  "Computing match scores",
  "Ranking candidates",
];
function cu(el, to, ms = 1200) {
  const t0 = performance.now();
  (function f(t) {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
function upd() {
  const c = +$("#cut").value;
  $("#cv").textContent = c;
  let n = 0;
  document.querySelectorAll(".card").forEach((el) => {
    const s = +el.dataset.s,
      k = s >= c ? "ok" : s >= c - 15 ? "wa" : "no";
    if (k == "ok") n++;
    el.dataset.k = k;
    el.querySelector(".badge").textContent = {
      ok: "Shortlisted",
      wa: "Under review",
      no: "Not selected",
    }[k];
  });
  $("#sc").textContent = n;
  const L = [...document.querySelectorAll(".card[data-k=ok]")];
  $("#slist").innerHTML = L.length
    ? L.map(
        (c) =>
          `<div class="si"><b>${c.querySelector("h3").innerHTML}</b><span>${c.dataset.s}% match</span></div>`,
      ).join("")
    : '<p class="sub">No candidate meets the cutoff. Lower the slider to shortlist more.</p>';
}
const W = [50, 25, 15, 10],
  DIM = ["Skills", "Relevance", "Experience", "Education"];
function rew() {
  const T = W.reduce((s, v) => s + v, 0) || 1,
    C = [...document.querySelectorAll(".card")];
  C.forEach((c) => {
    const s = Math.round(c.dataset.p.split(",").reduce((a, v, i) => a + v * W[i], 0) / T);
    c.dataset.s = s;
    c.querySelector(".p").style.strokeDashoffset = (163.4 * (1 - s / 100)).toFixed(1);
    c.querySelector(".ring b").textContent = s;
  });
  C.sort((a, b) => b.dataset.s - a.dataset.s).forEach((c, i) => {
    c.style.setProperty("--d", i * 0.05 + "s");
    c.querySelector(".rk").textContent = i + 1;
    c.parentNode.appendChild(c);
  });
  const B = document.querySelectorAll(".st b");
  B[2].textContent = Math.round(C.reduce((s, c) => s + +c.dataset.s, 0) / C.length);
  B[3].textContent = C[0].dataset.s;
  upd();
}
function closeC() {
  document.querySelectorAll(".cc").forEach((x) => (x.checked = false));
  $("#cmp").classList.remove("on");
}
function cmp() {
  const S = [...document.querySelectorAll(".cc:checked")].map((x) => x.closest(".card")),
    P = $("#cmp");
  if (S.length < 2) {
    P.classList.remove("on");
    return;
  }
  const K = ["var(--ac)", "var(--wa)"],
    D = S.map((c) => ({
      n: esc(c.querySelector("h3").textContent),
      s: +c.dataset.s,
      p: c.dataset.p.split(",").map(Number),
    })),
    pt = (v, k) =>
      (150 + v * 0.8 * Math.cos((k * Math.PI) / 2 - Math.PI / 2)).toFixed(1) +
      "," +
      (120 + v * 0.8 * Math.sin((k * Math.PI) / 2 - Math.PI / 2)).toFixed(1),
    pg = (v, f) => `<polygon points="${[0, 1, 2, 3].map((k) => pt(v[k], k)).join(" ")}" ${f}/>`,
    mx = (k) => Math.max(...D.map((d) => d.p[k])),
    w = D[0].s >= D[1].s ? D : [D[1], D[0]];
  P.innerHTML = `<div class="panel"><div class="row" style="justify-content:space-between;margin:0 0 6px"><h2>Side by side</h2><button class="btn" id="cx">Close</button></div><p class="sub">${w[0].s == w[1].s ? "Both candidates have the same overall score." : w[0].n + " leads by " + (w[0].s - w[1].s) + " points overall."}</p><div class="cg"><svg viewBox="0 0 300 240" width="100%" style="max-width:340px;margin:auto">${[25, 50, 75, 100].map((f) => pg([f, f, f, f], 'fill="none" stroke="var(--bd)"')).join("")}${D.map((d, j) => pg(d.p, `fill="${K[j]}" fill-opacity=".28" stroke="${K[j]}" stroke-width="2.5"`)).join("")}<g fill="var(--mu)" font-size="12"><text x="150" y="26" text-anchor="middle">Skills</text><text x="238" y="124">Relevance</text><text x="150" y="226" text-anchor="middle">Experience</text><text x="62" y="124" text-anchor="end">Education</text></g></svg><table class="ct"><tr><th></th>${D.map((d, j) => `<th style="color:${K[j]}">${d.n}</th>`).join("")}</tr>${DIM.map((n, k) => `<tr><td>${n}</td>${D.map((d) => `<td style="${d.p[k] == mx(k) ? "font-weight:700;color:var(--ok)" : ""}">${d.p[k]}%</td>`).join("")}</tr>`).join("")}<tr><td><b>Overall</b></td>${D.map((d) => `<td><b>${d.s}%</b></td>`).join("")}</tr></table></div></div>`;
  P.classList.add("on");
}
async function run() {
  const jd = $("#jd").value.trim(),
    rs = parse();
  if (!jd || !rs.length) {
    toast("Add a job description and at least one resume");
    return;
  }
  const O = $("#out");
  O.hidden = false;
  O.innerHTML = `<div class="pipe"><h2>Analyzing ${rs.length} resume${rs.length > 1 ? "s" : ""}</h2><div class="pb"><u></u></div><ul>${STEPS.map((s) => `<li>${s}</li>`).join("")}</ul></div>`;
  O.scrollIntoView({ behavior: "smooth", block: "start" });
  for (let i = 0; i < STEPS.length; i++) {
    await sl(480);
    O.querySelectorAll("li")[i].classList.add("on");
    O.querySelector(".pb u").style.width = ((i + 1) / STEPS.length) * 100 + "%";
  }
  await sl(500);
  const { rj, ry, re, res } = screenCandidates(jd, rs, W);
  const avg = Math.round(res.reduce((s, r) => s + r.score, 0) / res.length),
    NM = ["Skills", "Relevance", "Experience", "Education"];
  O.innerHTML =
    `<div class="stats"><div class="st"><b data-n="${res.length}">0</b><span>Candidates screened</span></div><div class="st" style="animation-delay:.1s"><b id="sc">0</b><span>Shortlisted</span></div><div class="st" style="animation-delay:.2s"><b data-n="${avg}">0</b><span>Average score</span></div><div class="st" style="animation-delay:.3s"><b data-n="${res[0].score}">0</b><span>Top score</span></div></div>
<div class="ctl"><label>Shortlist cutoff: <b id="cv">60</b>%<br><input type="range" id="cut" min="20" max="95" value="60" aria-label="Shortlist cutoff"></label><button class="btn" id="cp">Copy shortlist</button><button class="btn" id="bl">Blind mode</button></div><div class="panel wp"><h2>Scoring weights</h2><p class="sub">Choose what matters most for this role. The ranking updates live.</p><div class="wg">${DIM.map((n, i) => `<label>${n}: <b id="wv${i}">${W[i]}</b><input type="range" class="w" data-i="${i}" min="0" max="100" value="${W[i]}" aria-label="${n} weight"></label>`).join("")}</div></div><div class="sl"><h2>Shortlisted candidates</h2><div id="slist"></div></div><h2 style="margin:22px 0 12px;font-size:22px">Full ranking</h2><div id="cl">` +
    res
      .map(
        (
          r,
          i,
        ) => `<article class="card" style="--d:${0.5 + i * 0.12}s" data-s="${r.score}" data-p="${r.p.join(",")}"><div class="rk">${i + 1}</div>
<div class="ring"><svg viewBox="0 0 64 64" width="70" height="70"><circle class="t" cx="32" cy="32" r="26"/><circle class="p" cx="32" cy="32" r="26" data-o="${(163.4 * (1 - r.score / 100)).toFixed(1)}"/></svg><b data-n="${r.score}">0</b></div>
<div class="mid"><h3>${esc(r.name)}</h3><div class="meta">${r.y ? r.y + " years of experience" : "Experience not stated"}, ${EDU[r.e]}</div>
<div class="bars">${r.p.map((v, j) => `<div class="bar"><span>${NM[j]}</span><i><u data-w="${v}"></u></i><em>${v}%</em></div>`).join("")}</div>
<div class="chips">${r.m.map((k) => `<span class="chip m">${esc(lab(k))}</span>`).join("")}${r.x.map((k) => `<span class="chip x">${esc(lab(k))}</span>`).join("")}</div></div><span class="badge"></span><div class="why"><button class="btn xp">Why this score?</button><label class="cl"><input type="checkbox" class="cc"> Compare</label><div class="wb"><p><b>Skills.</b> Matched ${r.m.length} of ${rj.length} required skills.${r.x.length ? " Missing: " + r.x.map((k) => lab(k)).join(", ") + "." : " Every required skill is present."}</p><p><b>Experience.</b> ${r.y} years found${ry ? ", " + ry + " required" : ""}.</p><p><b>Education.</b> ${EDU[r.e]}${re ? ", " + EDU[re] + " required" : ""}.</p><p><b>Relevance.</b> Wording overlaps ${r.p[1]}% with the job description.</p>${
          r.x.length
            ? "<p><b>Interview questions.</b> " +
              r.x
                .slice(0, 2)
                .map((k) => "Describe a project where you used " + lab(k) + ".")
                .join(" ") +
              "</p>"
            : ""
        }</div></div></article>`,
      )
      .join("") +
    `</div><div class="mo" id="cmp"></div>`;
  upd();
  $("#cut").oninput = upd;
  O.querySelectorAll(".w").forEach(
    (s) =>
      (s.oninput = () => {
        W[+s.dataset.i] = +s.value;
        $("#wv" + s.dataset.i).textContent = s.value;
        rew();
      }),
  );
  $("#bl").onclick = () => {
    document.body.classList.toggle("anon");
    toast(
      document.body.classList.contains("anon") ? "Blind mode on: names hidden" : "Blind mode off",
    );
  };
  O.onclick = (e) => {
    const b = e.target.closest(".xp");
    if (b) {
      const w = b.parentNode;
      w.classList.toggle("o");
      b.textContent = w.classList.contains("o") ? "Hide details" : "Why this score?";
    }
  };
  O.onchange = (e) => {
    if (e.target.classList.contains("cc")) {
      if (document.querySelectorAll(".cc:checked").length > 2) {
        e.target.checked = false;
        toast("Pick only two candidates");
        return;
      }
      cmp();
    }
  };
  $("#cmp").onclick = (e) => {
    if (e.target.id == "cmp" || e.target.id == "cx") closeC();
  };
  $("#cp").onclick = async () => {
    const l = [...document.querySelectorAll(".card[data-k=ok]")]
      .map((c) => c.querySelector("h3").textContent + " (" + c.dataset.s + "%)")
      .join("\n");
    try {
      await navigator.clipboard.writeText(l || "No candidates shortlisted");
      toast("Shortlist copied");
    } catch (e) {
      toast(l ? l.replace(/\n/g, ", ") : "No candidates shortlisted");
    }
  };
  requestAnimationFrame(() => {
    O.querySelectorAll(".p").forEach((c) => (c.style.strokeDashoffset = c.dataset.o));
    O.querySelectorAll(".bar u").forEach((u) => (u.style.width = u.dataset.w + "%"));
    O.querySelectorAll("[data-n]").forEach((el) =>
      setTimeout(() => cu(el, +el.dataset.n), el.closest(".card") ? 600 : 200),
    );
  });
}
$("#go").onclick = run;
load();
