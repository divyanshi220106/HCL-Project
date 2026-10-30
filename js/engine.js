/* engine.js - TalentLens screening engine: skill extraction, TF-IDF similarity and weighted scoring. */
const SK = {
  python: ["python"],
  "machine learning": ["machine learning", "ml"],
  "deep learning": ["deep learning"],
  tensorflow: ["tensorflow"],
  pytorch: ["pytorch"],
  sql: ["sql", "mysql", "postgresql"],
  nlp: ["nlp", "natural language processing"],
  "scikit-learn": ["scikit-learn", "sklearn"],
  pandas: ["pandas"],
  numpy: ["numpy"],
  java: ["java"],
  javascript: ["javascript", "js"],
  react: ["react", "reactjs"],
  "node.js": ["node.js", "nodejs"],
  html: ["html"],
  css: ["css"],
  django: ["django"],
  flask: ["flask"],
  aws: ["aws", "amazon web services"],
  docker: ["docker"],
  kubernetes: ["kubernetes", "k8s"],
  git: ["git", "github"],
  "data analysis": ["data analysis", "data analytics"],
  tableau: ["tableau"],
  "power bi": ["power bi"],
  excel: ["excel"],
  "c++": ["c++"],
  mongodb: ["mongodb"],
  "rest api": ["rest api", "rest apis", "restful"],
  agile: ["agile", "scrum"],
  communication: ["communication"],
  leadership: ["leadership", "team lead"],
};
const LB = {
  sql: "SQL",
  nlp: "NLP",
  aws: "AWS",
  html: "HTML",
  css: "CSS",
  "power bi": "Power BI",
  "rest api": "REST API",
  tensorflow: "TensorFlow",
  pytorch: "PyTorch",
  mongodb: "MongoDB",
  javascript: "JavaScript",
  "scikit-learn": "scikit-learn",
  "node.js": "Node.js",
};
const lab = (k) => LB[k] || k.replace(/(^|\s)\w/g, (c) => c.toUpperCase());
const RX = Object.entries(SK).map(([k, a]) => [
  k,
  new RegExp(
    "(^|[^a-z0-9+#])(" +
      a.map((x) => x.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")).join("|") +
      ")(?![a-z0-9+#])",
    "i",
  ),
]);
const skills = (t) => RX.filter(([, r]) => r.test(t)).map(([k]) => k);
const yrs = (t) =>
  Math.min(
    30,
    Math.max(0, ...[...t.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi)].map((m) => +m[1])),
  );
const edu = (t) =>
  /\b(ph\.?d|doctorate)\b/i.test(t)
    ? 3
    : /\b(m\.?tech|m\.?sc|masters?|mba|mca)\b/i.test(t)
      ? 2
      : /\b(b\.?tech|b\.?sc|bachelors?|bca|b\.?com|bba)\b/i.test(t)
        ? 1
        : 0;
const EDU = ["Not stated", "Bachelor’s", "Master’s", "PhD"];
const SW = new Set(
  "the and for with are was were has have had that this from you your our will can able use using used all any not but who its their they them his her she him into over such per also etc plus new more than then well work working experience years year strong good need needs looking".split(
    " ",
  ),
);
const tok = (t) =>
  (t.toLowerCase().match(/[a-z][a-z+#.]+/g) || [])
    .map((w) => w.replace(/\.+$/, ""))
    .filter((w) => w.length > 1 && !SW.has(w));
function sims(jd, docs) {
  const all = [jd, ...docs].map(tok),
    N = all.length,
    df = {};
  all.forEach((d) => new Set(d).forEach((w) => (df[w] = (df[w] || 0) + 1)));
  const vec = (d) => {
    const tf = {};
    d.forEach((w) => (tf[w] = (tf[w] || 0) + 1));
    for (const w in tf) tf[w] *= Math.log((N + 1) / (df[w] + 1)) + 1;
    return tf;
  };
  const v = all.map(vec),
    dot = (a, b) => {
      let s = 0;
      for (const w in a) if (b[w]) s += a[w] * b[w];
      return s;
    },
    n = (a) => Math.sqrt(dot(a, a)) || 1;
  return v.slice(1).map((x) => dot(v[0], x) / (n(v[0]) * n(x)));
}

/* Split raw text into candidates. Resumes are separated by a line containing ---;
   the first line of each block is used as the candidate name. */
function parseResumes(raw) {
  const rs = raw
    .split(/^\s*-{3,}\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
  return rs.map((t, i) => {
    const l = t.split("\n")[0].trim();
    return { name: l.length <= 40 ? l : "Candidate " + (i + 1), text: t };
  });
}

/* Score and rank every candidate against the job description.
   W = weights [skills, relevance, experience, education]. Returns the detected
   requirements and the candidates sorted by final score (highest first). */
function screenCandidates(jd, rs, W) {
  const rj = skills(jd),
    ry = yrs(jd),
    re = edu(jd),
    S = sims(
      jd,
      rs.map((r) => r.text),
    );
  const res = rs
    .map((r, i) => {
      const sk = skills(r.text),
        m = rj.filter((k) => sk.includes(k)),
        y = yrs(r.text),
        e = edu(r.text);
      const a = rj.length ? m.length / rj.length : 0,
        b = Math.min(1, S[i] / 0.45),
        c = ry ? Math.min(1, y / ry) : Math.min(1, y / 5),
        d = re ? Math.min(1, e / re) : e / 3;
      return {
        ...r,
        m,
        x: rj.filter((k) => !sk.includes(k)),
        y,
        e,
        p: [a, b, c, d].map((v) => Math.round(v * 100)),
        score: Math.round(
          (100 * (W[0] * a + W[1] * b + W[2] * c + W[3] * d)) / (W.reduce((s, v) => s + v, 0) || 1),
        ),
      };
    })
    .sort((p, q) => q.score - p.score);
  return { rj, ry, re, res };
}

if (typeof module !== "undefined")
  module.exports = { skills, yrs, edu, sims, parseResumes, screenCandidates, lab, EDU };
