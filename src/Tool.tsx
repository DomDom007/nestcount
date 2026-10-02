// Nestcount: local residents count birds and insects around a site; the results feed a biodiversity report with standard indices.
import { useState } from "react";
import { openLater, shareLink, waLink } from "./lib/share";
import { uid, useCopy, useStored } from "./lib/store";
import { useShared } from "./lib/useShared";
import { prettyDate, todayISO, addDays } from "./lib/time";
import { Section, ShareBox, Stat, Stats } from "./ui/kit";

const T = "nestcount";
const SPECIES: Record<string, string[]> = {
  Birds: ["House sparrow", "Spotless starling", "Common blackbird", "Laughing dove", "Collared dove", "Barn swallow", "Common swift", "Great tit", "Sardinian warbler", "White wagtail", "Common kestrel", "Hoopoe", "Goldfinch", "Greenfinch", "Cattle egret"],
  Insects: ["Honey bee", "Carpenter bee", "Bumblebee", "Painted lady butterfly", "Cabbage white butterfly", "Swallowtail butterfly", "Hummingbird hawk-moth", "Seven-spot ladybird", "Red dragonfly", "Hoverfly"],
  Other: ["Hedgehog", "Gecko", "Lizard", "Bat (seen at dusk)", "Tortoise"],
};
type Visit = { id: string; date: string; observer: string; spot: string; minutes: number; weather: string; counts: Record<string, number> };
type Site = { name: string; client: string; phone: string; spots: string[] };
type Payload = { site: Site; visit?: Visit };
function sample(): Visit[] {
  let s = 4; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const all = Object.values(SPECIES).flat();
  return Array.from({ length: 8 }, (_, i) => ({ id: `v${i}`, date: addDays(todayISO(), -7 * (7 - i)), observer: ["Nadia", "Omar", "School club", "Sami"][i % 4], spot: ["North hedge", "Pond", "Rooftop garden"][i % 3], minutes: 30, weather: ["Sunny", "Cloudy", "Windy"][i % 3],
    counts: Object.fromEntries(all.filter(() => r() < 0.35 + i * 0.03).map(sp => [sp, 1 + Math.floor(r() * (sp.includes("sparrow") || sp.includes("bee") ? 12 : 4))])) }));
}
function indices(visits: Visit[]) {
  const tot: Record<string, number> = {};
  visits.forEach(v => Object.entries(v.counts).forEach(([k, n]) => (tot[k] = (tot[k] ?? 0) + n)));
  const N = Object.values(tot).reduce((a, b) => a + b, 0), S = Object.keys(tot).length;
  // Shannon diversity H' = -sum(p ln p); evenness = H' / ln(S).
  const H = N ? -Object.values(tot).reduce((a, n) => a + (n / N) * Math.log(n / N), 0) : 0;
  return { tot, N, S, H, E: S > 1 ? H / Math.log(S) : 0 };
}

function Form({ site, onDone }: { site: Site; onDone: (v: Visit) => void }) {
  const [v, setV] = useState<Visit>({ id: uid(), date: todayISO(), observer: "", spot: site.spots[0] ?? "", minutes: 20, weather: "Sunny", counts: {} });
  const inc = (sp: string, d: number) => setV({ ...v, counts: { ...v.counts, [sp]: Math.max(0, (v.counts[sp] ?? 0) + d) } });
  return (
    <div className="stack">
      <Section title="Your count">
        <div className="row"><label className="field"><span>Your name</span><input className="input" value={v.observer} onChange={e => setV({ ...v, observer: e.target.value })} /></label><label className="field"><span>Where</span><select className="input" value={v.spot} onChange={e => setV({ ...v, spot: e.target.value })}>{site.spots.map(s => <option key={s}>{s}</option>)}</select></label><label className="field"><span>Minutes watching</span><input className="input num" value={v.minutes} onChange={e => setV({ ...v, minutes: parseInt(e.target.value) || 0 })} /></label><label className="field"><span>Weather</span><select className="input" value={v.weather} onChange={e => setV({ ...v, weather: e.target.value })}>{["Sunny", "Cloudy", "Windy", "Light rain"].map(w => <option key={w}>{w}</option>)}</select></label></div>
        <p className="note" style={{ marginTop: 8 }}>Stand still for the whole time and count the most of each species you see at once, so the same bird isn't counted twice.</p>
      </Section>
      {Object.entries(SPECIES).map(([g, list]) => <Section key={g} title={g}><div className="nc-grid">{list.map(sp => <div key={sp} className={"nc-sp" + ((v.counts[sp] ?? 0) > 0 ? " on" : "")}><span>{sp}</span><div className="nc-step"><button className="btn" aria-label={`One fewer ${sp}`} onClick={() => inc(sp, -1)}>−</button><b className="num">{v.counts[sp] ?? 0}</b><button className="btn" aria-label={`One more ${sp}`} onClick={() => inc(sp, 1)}>+</button></div></div>)}</div></Section>)}
      <button className="btn primary" style={{ alignSelf: "flex-start" }} disabled={!v.observer.trim() || !Object.values(v.counts).some(n => n > 0)} onClick={() => onDone({ ...v, counts: Object.fromEntries(Object.entries(v.counts).filter(([, n]) => n > 0)) })}>Finish count</button>
    </div>
  );
}

export default function Nestcount() {
  const shared = useShared<Payload>();
  const [site, setSite] = useStored<Site>(T, "site", { name: "Les Jardins du Lac, phase 2", client: "Lac Développement", phone: "", spots: ["North hedge", "Pond", "Rooftop garden"] });
  const [visits, setVisits] = useStored<Visit[]>(T, "visits", sample());
  const [sent, setSent] = useState(false);
  const [added, setAdded] = useState(false);
  const [mode, setMode] = useState<"report" | "count">("report");
  const { copy, copied } = useCopy();
  const css = <style>{`.nc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}.nc-sp{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:8px 10px}.nc-sp.on{border-color:var(--good);background:color-mix(in srgb,var(--good) 8%,transparent)}.nc-step{display:flex;align-items:center;gap:6px}.nc-step .btn{width:34px;height:34px;padding:0}.nc-step b{min-width:22px;text-align:center}
  .nc-report{background:#fff;color:#151933}.nc-report .note,.nc-report .stat span{color:#555C78}.nc-bars{display:grid;gap:4px}.nc-bar{display:grid;grid-template-columns:200px 1fr 50px;gap:8px;align-items:center;font-size:14px}.nc-bar i{display:block;height:10px;background:#00A95C;border-radius:5px}
  @media print{body *{visibility:hidden}.nc-report,.nc-report *{visibility:visible}.nc-report{position:absolute;inset:0 auto auto 0;width:100%}.no-print{display:none!important}}`}</style>;

  if (shared.loading) return <p className="empty-note">Opening…</p>;
  if (shared.data && shared.mode === "survey") {
    const s = shared.data.site;
    return <div className="stack">{css}<section className="panel"><p className="eyebrow">Wildlife count</p><h2 style={{ fontSize: 32 }}>{s.name}</h2><p>Thank you for helping record the wildlife around this site. It takes about 20 minutes.</p></section>
      {sent ? <section className="panel"><h2>Thank you!</h2><p>Your count has been sent.</p></section> : <Form site={s} onDone={async v => { await openLater(async () => waLink(`My wildlife count for ${s.name}: ${await shareLink(T, { site: s, visit: v }, "m=results")}`, s.phone)); setSent(true); }} />}</div>;
  }
  if (shared.data && shared.mode === "results" && shared.data.visit) {
    const v = shared.data.visit;
    return <Section title={`Count from ${v.observer}`} aside={added ? <span className="pill good">Added</span> : <button className="btn primary small" onClick={() => { setVisits([...visits.filter(x => x.id !== v.id), v]); setAdded(true); }}>Add to the report</button>}>
      <p className="note">{prettyDate(v.date)} · {v.spot} · {v.minutes} min · {v.weather}</p>
      <ul>{Object.entries(v.counts).map(([k, n]) => <li key={k}>{k}: {n}</li>)}</ul><a className="btn" href="/t/nestcount">Open the report</a></Section>;
  }

  const idx = indices(visits);
  const first = indices(visits.slice(0, Math.ceil(visits.length / 2))), last = indices(visits.slice(Math.ceil(visits.length / 2)));
  const top = Object.entries(idx.tot).sort((a, b) => b[1] - a[1]);
  const max = top[0]?.[1] ?? 1;
  const groupOf = (sp: string) => Object.entries(SPECIES).find(([, l]) => l.includes(sp))?.[0] ?? "Other";
  return (
    <div className="stack">{css}
      <div className="row no-print"><div className="seg-mini"><button aria-pressed={mode === "report"} onClick={() => setMode("report")}>Report</button><button aria-pressed={mode === "count"} onClick={() => setMode("count")}>Add a count</button></div></div>
      {mode === "count" ? <Form site={site} onDone={v => { setVisits([...visits, v]); setMode("report"); }} /> : <>
        <div className="grid2 no-print">
          <Section title="Site">
            <div className="stack" style={{ gap: 10 }}><label className="field"><span>Site</span><input className="input" value={site.name} onChange={e => setSite({ ...site, name: e.target.value })} /></label><div className="row"><label className="field"><span>Report for</span><input className="input" value={site.client} onChange={e => setSite({ ...site, client: e.target.value })} /></label><label className="field"><span>WhatsApp for results</span><input className="input" value={site.phone} onChange={e => setSite({ ...site, phone: e.target.value })} /></label></div>
              <label className="field"><span>Survey spots, separated by commas</span><input className="input" value={site.spots.join(", ")} onChange={e => setSite({ ...site, spots: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} /></label></div>
          </Section>
          <Section title="Invite residents to count"><ShareBox slug={T} data={{ site }} mode="survey" label="Copy survey link" message={`Help us count the wildlife around ${site.name}:`} /><p className="note" style={{ marginTop: 8 }}>Volunteers send their count back as a link. Open it here to add it.</p></Section>
        </div>
        <section className="panel nc-report">
          <div className="row no-print" style={{ justifyContent: "flex-end" }}><button className="btn small" onClick={() => copy(`${site.name}: ${idx.S} species, ${idx.N} individuals over ${visits.length} visits. Shannon index ${idx.H.toFixed(2)}.`)}>{copied ? "Copied" : "Copy summary"}</button><button className="btn small primary" onClick={() => window.print()}>Print report</button></div>
          <p className="eyebrow">Biodiversity monitoring report</p><h2 style={{ fontSize: 34, margin: "4px 0" }}>{site.name}</h2><p className="note">Prepared for {site.client} · {visits.length} survey visits from {visits.length ? prettyDate(visits[0].date) : "–"} to {visits.length ? prettyDate(visits[visits.length - 1].date) : "–"}</p>
          <div style={{ margin: "16px 0" }}><Stats><Stat value={idx.S} label="Species recorded" /><Stat value={idx.N} label="Individuals counted" /><Stat value={idx.H.toFixed(2)} label="Shannon diversity (H')" /><Stat value={idx.E.toFixed(2)} label="Evenness" /><Stat value={`${last.S >= first.S ? "+" : ""}${last.S - first.S}`} label="Species, recent vs early visits" tone={last.S >= first.S ? "good" : "bad"} /></Stats></div>
          <h3 style={{ fontSize: 20, margin: "10px 0" }}>Species by count</h3>
          <div className="nc-bars">{top.map(([sp, n]) => <div key={sp} className="nc-bar"><span>{sp} <span className="note">{groupOf(sp)}</span></span><i style={{ width: `${(n / max) * 100}%` }} /><b className="num">{n}</b></div>)}</div>
          <h3 style={{ fontSize: 20, margin: "16px 0 6px" }}>Visits</h3>
          <table className="t"><tbody>{visits.map(v => <tr key={v.id}><td>{prettyDate(v.date)}</td><td>{v.spot}</td><td>{v.observer}</td><td>{v.weather}</td><td className="r">{Object.keys(v.counts).length} species</td><td className="r no-print"><button className="btn ghost small danger" onClick={() => setVisits(visits.filter(x => x.id !== v.id))}>×</button></td></tr>)}</tbody></table>
          <p className="note" style={{ marginTop: 12 }}>Method: fixed-point counts of 20 to 30 minutes by trained volunteers, recording the maximum seen at once per species. Shannon index from pooled counts. Citizen-science data; suitable for trend monitoring alongside professional ecological surveys.</p>
        </section>
      </>}
    </div>
  );
}
