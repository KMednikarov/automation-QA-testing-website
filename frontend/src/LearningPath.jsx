import React, { useState, useRef } from "react";
import { ArrowRight, Check, BookOpen, Clock, Copy } from "lucide-react";
import { course } from "./course.js";

function Example({ example }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(example.code);
      setCopied(true);
    } catch {
      setCopied(false); // The selectable code remains usable without clipboard access.
    }
  }
  return <div className="course-example">
    <div><h4>{example.title}</h4><button type="button" className="text" onClick={copy}><Copy size={14} />{copied ? "Copied" : "Copy code"}</button></div>
    <pre><code>{example.code}</code></pre>
  </div>;
}

function List({ items, ordered = false }) {
  const Tag = ordered ? "ol" : "ul";
  return <Tag>{items.map(item => <li key={item}>{item}</li>)}</Tag>;
}

export default function LearningPath({ userId }) {
  const storageKey = `atlas-api-course-v1:${userId}`;
  const [selected, setSelected] = useState(0);
  const [completed, setCompleted] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved.filter(id => Number.isInteger(id) && id >= 1 && id <= 8) : [];
    } catch { return []; }
  });
  const title = useRef(null);
  const session = course.sessions[selected];
  function navigate(index) {
    setSelected(index);
    title.current?.focus({ preventScroll: true });
    title.current?.scrollIntoView({ block: "start" });
  }
  function toggleComplete() {
    const next = completed.includes(session.id) ? completed.filter(id => id !== session.id) : [...completed, session.id];
    setCompleted(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Progress works for this visit. */ }
  }
  return <div className="api-course">
    <section className="learning-intro course-intro">
      <div><span className="eyebrow">POSTMAN AND KARATE</span><h2>{course.title}</h2><p>{course.description}</p>
        <div className="course-facts"><span><Clock size={15} />12 hours</span><span><BookOpen size={15} />8 sessions</span><span>{completed.length} of 8 marked complete</span></div>
      </div>
      <a className="secondary" href="/docs" target="_blank" rel="noreferrer">Open API reference<ArrowRight size={15} /></a>
    </section>
    <details className="card course-preparation"><summary>Before your first session</summary><List items={course.preparation} /><p>Completion is recorded by you and saved in this browser. Your test reports provide execution evidence.</p></details>
    <div className="course-layout">
      <nav className="card course-nav" aria-label="Course sessions">
        <h3>Your learning path</h3>
        {course.sessions.map((item, index) => <button key={item.id} type="button" aria-current={selected === index ? "step" : undefined} onClick={() => navigate(index)}>
          <span className="course-number">{completed.includes(item.id) ? <Check size={17} aria-label="Complete" /> : String(item.id).padStart(2, "0")}</span>
          <span><strong>{item.title}</strong><small>{item.tool}</small></span>
        </button>)}
      </nav>
      <article className="card course-lesson" aria-labelledby="course-session-title">
        <div className="course-lesson-heading"><span className="eyebrow">SESSION {session.id} OF 8 · 90 MINUTES · {session.tool.toUpperCase()}</span><h2 id="course-session-title" ref={title} tabIndex={-1}>{session.title}</h2><p>{session.outcome}</p></div>
        <section><h3>What you will learn</h3><List items={session.objectives} /></section>
        <details className="course-agenda"><summary>90-minute session plan</summary><List items={session.agenda} /></details>
        <section><h3>The lesson</h3>{session.theory.map(part => <div className="course-topic" key={part.title}><h4>{part.title}</h4><p>{part.text}</p></div>)}</section>
        <section><h3>Worked examples</h3>{session.examples.map(example => <Example key={`${session.id}:${example.title}`} example={example} />)}</section>
        <section><h3>Instructor demonstration</h3><List items={session.demo} ordered /></section>
        <section className="course-lab"><span className="eyebrow">HANDS ON</span><h3>Your API lab</h3><List items={session.tasks} ordered /></section>
        <section><h3>Completion checks</h3><List items={session.checkpoints} /><p className="course-deliverable"><strong>Deliverable</strong> {session.deliverable}</p></section>
        <section><h3>Check your understanding</h3>{session.questions.map(item => <details className="course-question" key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</section>
        {session.targets.length > 0 && <section className="course-coverage"><h3>API challenge coverage</h3><p>Relevant instructor challenge IDs: {session.targets.join(", ")}. Keep the correct contract assertions and record clean, faulty, and recovered results.</p></section>}
        <div className="course-completion"><label><input type="checkbox" checked={completed.includes(session.id)} onChange={toggleComplete} />Mark session {session.id} complete</label><p>Your own progress record, not an automated grade.</p></div>
        <div className="course-pager"><button type="button" className="secondary" disabled={selected === 0} onClick={() => navigate(selected - 1)}>Previous session</button><span>{session.id} / 8</span><button type="button" className="primary" disabled={selected === 7} onClick={() => navigate(selected + 1)}>Next session<ArrowRight size={15} /></button></div>
      </article>
    </div>
  </div>;
}
