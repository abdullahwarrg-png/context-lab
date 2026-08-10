"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpen, Braces, ChevronDown, CircleCheck, Database, FileText, Github, Play, Search, Settings2, Sparkles } from "lucide-react";

const passages = [
  { id: "01", title: "Cache invalidation", source: "architecture-notes.md", text: "Use event-driven invalidation when stale reads create business risk. Attach the aggregate version to every invalidation event so consumers can ignore reordered messages.", score: .92 },
  { id: "02", title: "Safe fallbacks", source: "resilience-guide.md", text: "A cache fallback should be bounded by an explicit staleness budget. Surface degraded freshness in telemetry rather than silently serving old data forever.", score: .81 },
  { id: "03", title: "Write-through strategy", source: "data-patterns.md", text: "Write-through caching simplifies read paths but makes cache availability part of the write contract. Pair it with idempotency and a recovery queue.", score: .74 },
];

type WorkerResult = { scores?: number[]; error?: string };

export default function Home() {
  const [query, setQuery] = useState("How should we invalidate cached data safely?");
  const [chunkSize, setChunkSize] = useState(420);
  const [status, setStatus] = useState("Sample run");
  const [scores, setScores] = useState(passages.map((item) => item.score));
  const workerRef = useRef<Worker | null>(null);
  const ranked = useMemo(() => passages.map((item, index) => ({ ...item, score: scores[index] ?? item.score })).sort((a, b) => b.score - a.score), [scores]);

  function runModel() {
    setStatus("Loading local model…");
    workerRef.current ??= new Worker(new URL("../workers/embedding.worker.ts", import.meta.url));
    workerRef.current.onmessage = ({ data }: MessageEvent<WorkerResult>) => {
      if (data.error) setStatus("Sample fallback");
      else { setScores(data.scores ?? scores); setStatus("Local model complete"); }
    };
    workerRef.current.postMessage({ query, passages: passages.map((item) => item.text) });
  }

  return (
    <div className="lab-shell">
      <header className="lab-header">
        <div className="lab-brand"><span><Braces size={19}/></span><strong>Context Lab</strong><em>Retrieval workbench</em></div>
        <nav><a href="#workspace">Workspace</a><a href="#evaluation">Evaluation</a><a href="https://github.com/abdullahwarrg-png/context-lab" aria-label="GitHub"><Github size={18}/></a></nav>
      </header>

      <main id="workspace">
        <section className="intro">
          <div><p className="overline">EXPERIMENT / RETRIEVAL-04</p><h1>Inspect what your model actually sees.</h1><p>Compare chunking and semantic retrieval locally. No documents leave your browser.</p></div>
          <div className="privacy-note"><CircleCheck size={16}/><span><strong>Private by design</strong>Inference runs in a Web Worker</span></div>
        </section>

        <div className="workbench">
          <aside className="controls">
            <div className="control-heading"><Settings2 size={16}/><strong>Run configuration</strong></div>
            <label>Embedding model<button className="select-control">all-MiniLM-L6-v2 <ChevronDown size={14}/></button></label>
            <label>Chunk strategy<button className="select-control">Recursive text <ChevronDown size={14}/></button></label>
            <label>Chunk size <span>{chunkSize} tokens</span><input type="range" min="200" max="800" step="20" value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))}/></label>
            <label>Overlap <span>64 tokens</span><input type="range" min="0" max="160" defaultValue="64"/></label>
            <div className="control-stat"><span>Corpus</span><strong>18 documents</strong><small>42,680 tokens indexed</small></div>
            <button className="run-button" onClick={runModel}><Play size={15} fill="currentColor"/>Run local model</button>
          </aside>

          <section className="results" id="evaluation">
            <div className="query-block">
              <label htmlFor="query"><Search size={15}/>TEST QUERY</label>
              <div><textarea id="query" value={query} onChange={(event) => setQuery(event.target.value)} rows={2}/><button onClick={runModel} aria-label="Run retrieval"><Play size={17} fill="currentColor"/></button></div>
            </div>
            <div className="result-summary">
              <div><span className="model-status"><i/>{status}</span><strong>Top evidence</strong><small>{ranked.length} of 43 chunks · cosine similarity</small></div>
              <div className="summary-metrics"><span><small>Precision@3</small><strong>0.89</strong></span><span><small>Mean score</small><strong>{(ranked.reduce((sum, item) => sum + item.score, 0) / ranked.length).toFixed(2)}</strong></span></div>
            </div>
            <div className="passage-list">
              {ranked.map((passage, index) => <article key={passage.id} className={index === 0 ? "top" : ""}>
                <div className="rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="passage-body"><div className="passage-meta"><FileText size={13}/><strong>{passage.title}</strong><span>{passage.source}</span></div><p>{passage.text}</p><footer><span>chunk {passage.id} · {Math.round(chunkSize * .86)} tokens</span><button>Inspect context</button></footer></div>
                <div className="score"><strong>{passage.score.toFixed(2)}</strong><span style={{"--score": `${passage.score * 100}%`} as React.CSSProperties}/></div>
              </article>)}
            </div>
          </section>
        </div>

        <section className="pipeline">
          <div><p className="overline">VISIBLE PIPELINE</p><h2>From source to evidence</h2></div>
          <div className="pipeline-steps"><span><BookOpen size={17}/><b>18</b><small>documents</small></span><i>→</i><span><Braces size={17}/><b>43</b><small>chunks</small></span><i>→</i><span><Database size={17}/><b>384d</b><small>vectors</small></span><i>→</i><span><Sparkles size={17}/><b>3</b><small>results</small></span></div>
        </section>
      </main>
    </div>
  );
}
