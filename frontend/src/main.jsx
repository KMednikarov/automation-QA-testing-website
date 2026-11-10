import React, { useState, useEffect, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Moon,
  Sun,
  BarChart3,
  Database,
  FileText,
  BookOpen,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  ArrowRight,
  Download,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./style.css";
import LearningPath from "./LearningPath.jsx";
const regions = ["Europe", "North America", "Asia Pacific", "Latin America"];
const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
function Brand() {
  return (
    <div className="brand">
      <BarChart3 size={27} />
      atlas <small>DATA LAB</small>
    </div>
  );
}
function ThemeToggle({ theme, toggle }) {
  const dark = theme === "dark";
  return (
    <button
      className="secondary theme-toggle"
      type="button"
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      aria-pressed={dark}
      onClick={toggle}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("atlas-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("atlas-theme", theme);
    } catch {
      // Theme changes remain available for this visit.
    }
  }, [theme]);
  const themeToggle = (
    <ThemeToggle
      theme={theme}
      toggle={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
    />
  );
  const [token, setToken] = useState(
      sessionStorage.getItem("atlas-token") || "",
    ),
    [user, setUser] = useState(null),
    [view, setView] = useState("Overview");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const [data, setData] = useState(null),
    [region, setRegion] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(null);
  const [email, setEmail] = useState("analyst@atlas.test"),
    [password, setPassword] = useState("Training123!");
  const defects = data?.training.defects || {};
  const signOut = () => {
    sessionStorage.removeItem("atlas-token");
    setToken("");
    setUser(null);
    setData(null);
    setModal(null);
    setView("Overview");
    setRegion("");
    setStart("");
    setEnd("");
    setPage(1);
  };
  async function api(path, options = {}) {
    const r = await fetch("/api" + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        ...options.headers,
      },
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 && token) signOut();
      throw Error(
        typeof d.detail === "string"
          ? d.detail
          : d.detail
              ?.map((x) => x.loc.slice(1).join(".") + ": " + x.msg)
              .join("; ") || "Request failed",
      );
    }
    return r.status === 204 ? null : r.json();
  }
  async function act(fn, message) {
    setError("");
    try {
      await fn();
      setNotice(message);
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  useEffect(() => {
    if (!token) return;
    let active = true;
    api("/auth/me")
      .then((u) => active && setUser(u))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setBusy(true);
    const q = new URLSearchParams();
    if (region) q.set("region", region);
    if (start) q.set("start_date", start);
    if (end) q.set("end_date", end);
    Promise.all([
      api("/dashboard?" + q),
      api("/sales?" + q + "&page=" + page),
      api("/reports"),
      api("/training"),
    ])
      .then(([dashboard, sales, reports, training]) => {
        if (active) setData({ dashboard, sales, reports, training });
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [user, region, start, end, page, version]);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem("atlas-token", r.access_token);
      setToken(r.access_token);
      setUser(r.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(report) {
    try {
      const r = await fetch(`/api/reports/${report.id}/export`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!r.ok) throw Error("Export failed");
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = `atlas-report-${report.id}.${defects.ui_csv_extension ? "txt" : "csv"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  }
  async function save(values) {
    if (modal.kind === "sale" && defects.ui_zero_discount)
      values = { ...values, discount: 0 };
    let path,
      method = "POST";
    if (modal.kind === "reset") {
      path = "/training/reset";
    } else if (modal.kind.startsWith("delete")) {
      path = `/${modal.kind === "delete-sale" ? "sales" : "reports"}/${modal.row.id}`;
      method = "DELETE";
    } else {
      path = `/${modal.kind === "sale" ? "sales" : "reports"}${modal.row ? "/" + modal.row.id : ""}`;
      method = modal.row ? "PUT" : "POST";
    }
    const ok = await act(
      () =>
        api(path, {
          method,
          body: method === "DELETE" ? undefined : JSON.stringify(values),
        }),
      modal.kind === "reset"
        ? "Training data restored. Please sign in again."
        : "Changes saved.",
    );
    if (ok) {
      if (modal.kind === "reset") signOut();
      setModal(null);
    }
    return ok;
  }
  const messages = (
    <>
      {error && !(defects.ui_hide_filter_error && ["Overview", "Sales data"].includes(view)) && (
        <div role="alert" className="alert error">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="alert success">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
  if (!user)
    return (
      <div className="login">
        <section className="login-story">
          <Brand />
          <div>
            <span className="eyebrow">
              THE DATA IS FICTIONAL. THE SKILLS ARE REAL.
            </span>
            <h1>
              A little curiosity.
              <br />A lot of possibility.
            </h1>
            <p>
              Your hands-on playground for exploring data,
              <br />
              testing APIs, and finding what others miss.
            </p>
            <div className="story-chart">
              {[30, 60, 50, 85, 65, 110, 90, 130, 105, 150].map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </div>
          </div>
          <small>ATLAS / QA LEARNING LAB</small>
        </section>
        <section className="login-form">
          <div className="login-tools">
            <span className="pill">
              <FlaskConical size={14} /> Training environment
            </span>
            {themeToggle}
          </div>
          <h2>Welcome to Atlas</h2>
          <p className="muted">Sign in and start exploring your data.</p>
          {messages}
          <form onSubmit={login}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="demo">
            <strong>Your training accounts</strong>
            <p>
              Shared password: <code>Training123!</code>
            </p>
            <button onClick={() => setEmail("analyst@atlas.test")}>
              Use analyst account
              <ArrowRight size={14} />
            </button>
            <button onClick={() => setEmail("admin@atlas.test")}>
              Use administrator account
              <ArrowRight size={14} />
            </button>
            <small>
              Synthetic data only. One shared workspace per instance.
            </small>
          </div>
        </section>
      </div>
    );
  const dashboard = data?.dashboard,
    sales = data?.sales;
  const nav = [
    ["Overview", LayoutDashboard],
    ["Sales data", Database],
    ["Reports", FileText],
    ["Learning path", BookOpen],
    ...(user.role === "admin" ? [["Instructor lab", FlaskConical]] : []),
  ];
  return (
    <div className="shell">
      <aside>
        <Brand />
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={name === view ? "active" : ""}
              onClick={() => {
                setView(name);
                setNotice("");
                setError("");
              }}
            >
              <Icon size={18} />
              {name}
              {name === "Learning path" && <small>8</small>}
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <div className="lab-note">
            <span className="dot" /> Made for discovery
            <p>
              A safe place to ask questions
              <br />
              and put your tests to work.
            </p>
            <a href="/docs" target="_blank" rel="noreferrer">
              Explore API docs <ArrowRight size={13} />
            </a>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                await act(() => api("/auth/logout", { method: "POST" }), "");
                signOut();
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <span>
            Workspace <i>/</i> <strong>{view}</strong>
          </span>
          <div>
            <span className="pill">
              <span
                className={
                  "dot " + (data?.training.mode === "training" ? "amber" : "")
                }
              />
              {data?.training.mode === "training"
                ? "Training mode"
                : "Clean mode"}
            </span>
            <small>2026 SAMPLE DATA</small>
            {themeToggle}
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR DATA, IN FOCUS</span>
              <h1>{view === "Overview" ? "Workspace overview" : view}</h1>
              <p className="muted">
                {
                  {
                    Overview:
                      "A clearer picture of your sales. A new opportunity to explore.",
                    "Sales data": "Explore the records behind every number.",
                    Reports:
                      "Save a perspective. Share the story in your data.",
                    "Learning path":
                      "Eight guided API sessions with Postman and Karate.",
                    "Instructor lab":
                      "Set the challenge for your next training session.",
                  }[view]
                }
              </p>
            </div>
            {["Overview", "Sales data"].includes(view) && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setVersion((v) => v + 1)}
              >
                <RefreshCw size={14} />
                Refresh data
              </button>
            )}
            {view === "Reports" && (
              <button
                className="primary"
                onClick={() => setModal({ kind: "report" })}
              >
                <Plus size={16} />
                Create report
              </button>
            )}
          </div>
          {messages}
          {["Overview", "Sales data"].includes(view) && (
            <div className="filters">
              <span>Explore your data</span>
              <label className="sr-only" htmlFor="region">
                Region
              </label>
              <select
                id="region"
                value={region}
                onChange={(e) => {
                  setRegion(defects.ui_wrong_region && e.target.value === "Europe" ? "North America" : e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <label>
                From
                <input
                  type="date"
                  aria-label="Start date"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  aria-label="End date"
                  value={end}
                  onChange={(e) => {
                    setEnd(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              {(region || start || end) && (
                <button
                  className="text"
                  onClick={() => {
                    setRegion("");
                    setStart("");
                    setEnd("");
                    setPage(1);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
          {busy && (
            <p role="status" className="loading">
              Updating workspace…
            </p>
          )}
          {view === "Overview" && dashboard && (
            <>
              <div className="metrics">
                {[
                  [
                    "Net revenue",
                    money(dashboard.revenue + (defects.ui_revenue_offset ? 1000 : 0)),
                    "After applied discounts",
                    BarChart3,
                  ],
                  [
                    "Sales orders",
                    defects.ui_orders_from_customers ? dashboard.customers : dashboard.orders,
                    "Across your selected period",
                    FileText,
                  ],
                  [
                    "Active customers",
                    dashboard.customers,
                    "Unique customers in this view",
                    Database,
                  ],
                  [
                    "Average order",
                    money(dashboard.average_order),
                    "Net revenue per sale",
                    BarChart3,
                  ],
                ].map(([name, value, caption, Icon]) => (
                  <section className="metric" key={name}>
                    <div>
                      {name}
                      <Icon size={17} />
                    </div>
                    <strong
                      data-testid={name.toLowerCase().replaceAll(" ", "-")}
                    >
                      {value}
                    </strong>
                    <small>{caption}</small>
                  </section>
                ))}
              </div>
              <div className="chart-grid">
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h2>Revenue over time</h2>
                      <p>Monthly performance, at a glance</p>
                    </div>
                    <span className="legend">
                      <i />
                      Net revenue
                    </span>
                  </div>
                  <div className="chart">
                    {dashboard.monthly.length ? (
                      dashboard.monthly.map((m) => (
                        <div className="column" key={m.month}>
                          <span>{money(m.revenue)}</span>
                          <div>
                            <i
                              style={{
                                height: `${Math.max(1, (m.revenue / Math.max(...dashboard.monthly.map((x) => x.revenue))) * 100)}%`,
                              }}
                            />
                          </div>
                          <small>
                            {new Date(m.month + "-02").toLocaleDateString(
                              "en-US",
                              { month: "short", year: "2-digit" },
                            )}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="muted">No sales in this period.</p>
                    )}
                  </div>
                </section>
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h2>Revenue by region</h2>
                      <p>Where the business is growing</p>
                    </div>
                  </div>
                  <div className="regions">
                    {Object.entries(dashboard.by_region).map(([r, v], i) => (
                      <div key={r}>
                        <div>
                          <span>
                            <i
                              style={{
                                background: [
                                  "#36745d",
                                  "#8aa990",
                                  "#d6b077",
                                  "#9cb0bc",
                                ][i],
                              }}
                            />
                            {r}
                          </span>
                          <strong>{money(v)}</strong>
                        </div>
                        <div className="track">
                          <i
                            style={{
                              width: `${dashboard.revenue ? (v / dashboard.revenue) * 100 : 0}%`,
                              background: [
                                "#36745d",
                                "#8aa990",
                                "#d6b077",
                                "#9cb0bc",
                              ][i],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="learn-banner">
                <BookOpen size={30} />
                <div>
                  <span className="eyebrow">LEARN BY DOING</span>
                  <h3>Every number has a story. Put it to the test.</h3>
                  <p>
                    Eight guided sessions. One complete API testing project.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setView("Learning path")}
                >
                  Explore learning path
                  <ArrowRight size={15} />
                </button>
              </div>
              <SalesTable
                data={sales}
                compact
                onMore={() => setView("Sales data")}
              />
            </>
          )}
          {view === "Sales data" && sales && (
            <>
              <div className="section-actions">
                <span className="muted">
                  {sales.total} records · ordered by date, then ID
                </span>
                {user.role === "admin" && (
                  <button
                    className="primary"
                    onClick={() => setModal({ kind: "sale" })}
                  >
                    <Plus size={15} />
                    Add sale
                  </button>
                )}
              </div>
              <SalesTable
                data={sales}
                admin={user.role === "admin"}
                edit={(r) => setModal({ kind: "sale", row: r })}
                remove={(r) => setModal({ kind: "delete-sale", row: r })}
              />
              <div className="pagination">
                <span>
                  Page {page} · {sales.total} matching records
                </span>
                <div>
                  <button
                    className="secondary"
                    disabled={page === 1 || busy}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>
                  <button
                    className="secondary"
                    disabled={page * 10 >= sales.total || busy}
                    onClick={() => setPage((p) => defects.ui_stuck_next_page ? p : p + 1)}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
          {view === "Reports" && data && (
            <div className="report-grid">
              {data.reports.map((r) => (
                <section className="card report" key={r.id}>
                  <div className="report-top">
                    <span className="report-icon">
                      <FileText size={24} />
                    </span>
                    <span className="pill">Saved report</span>
                  </div>
                  <h2>{r.name}</h2>
                  <p className="muted">
                    {r.region || "All regions"} · {r.start_date || "Beginning"}{" "}
                    → {r.end_date || "Present"}
                  </p>
                  <small>Created by {r.owner}</small>
                  <div className="report-actions">
                    <button className="secondary" onClick={() => download(r)}>
                      <Download size={14} />
                      Export CSV
                    </button>
                    {(user.role === "admin" || r.owner_id === user.id) && (
                      <>
                        <button
                          className="text"
                          onClick={() => setModal({ kind: "report", row: r })}
                        >
                          Edit
                        </button>
                        <button
                          className="danger-icon"
                          aria-label={"Delete " + r.name}
                          onClick={() =>
                            setModal({ kind: "delete-report", row: r })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </section>
              ))}
              {!data.reports.length && (
                <div className="card empty">
                  <FileText size={30} />
                  <h2>Your next insight starts here</h2>
                  <p>
                    Create a report to save filters and export matching sales.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setModal({ kind: "report" })}
                  >
                    Create your first report
                  </button>
                </div>
              )}
            </div>
          )}
          {view === "Learning path" && <LearningPath key={user.id} userId={user.id} />}
          {view === "Instructor lab" && user.role === "admin" && data && (
            <>
              <div className="lab-warning">
                <FlaskConical size={23} />
                <div>
                  <strong>A controlled space for deliberate defects</strong>
                  <p>
                    Settings affect everyone on this instance. Use one instance
                    per learner or team. Clean mode is the reference behavior.
                  </p>
                </div>
              </div>
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>Choose your challenge</h2>
                    <p>
                      Enable a defect, then ask learners to find it through
                      their tests.
                    </p>
                  </div>
                  <span className="pill">
                    {
                      Object.values(data.training.defects).filter(Boolean)
                        .length
                    }{" "}
                    active
                  </span>
                </div>
                <button className="secondary" disabled={busy || !Object.values(defects).some(Boolean)} onClick={() => act(() => api("/training/defects", {
                  method: "PUT", body: JSON.stringify(Object.fromEntries(Object.keys(defects).map(key => [key, false]))),
                }), "Clean mode restored. Data and sessions kept.")}>Return to clean mode</button>
                {[["api", "API challenges", "Use these 10 challenges with the API course."], ["ui", "UI defects", "Ten separate UI switches are available for application testing. The learning path contains API exercises only."]].map(([group, heading, description]) => <section className="defect-group" key={group} aria-label={heading}>
                  <h3>{heading} · {data.training.catalogue[group].length}</h3><p>{description}</p>
                  {data.training.catalogue[group].map(({ id, key, title, description }) => <div className="defect" key={key}>
                    <div><span className="eyebrow">{id}</span><h3>{title}</h3><p>{description}</p><code>{key}</code></div>
                    <button role="switch" aria-label={`${id}: ${title}`} aria-checked={defects[key]} disabled={busy} className={"toggle " + (defects[key] ? "on" : "")} onClick={() => act(() => api("/training/defects", {
                      method: "PUT", body: JSON.stringify({ ...defects, [key]: !defects[key] }),
                    }), "Defect settings updated.")}><span /></button>
                  </div>)}
                </section>)}
              </section>
              <div className="card reset">
                <div>
                  <h2>A fresh starting point</h2>
                  <p>
                    Restore 120 sales, two reports, and clean mode. This deletes
                    custom data and signs everyone out.
                  </p>
                </div>
                <button
                  className="danger"
                  onClick={() => setModal({ kind: "reset" })}
                >
                  <RefreshCw size={15} />
                  Reset training data
                </button>
              </div>
            </>
          )}
          <footer>
            <span>
              <span className="dot" /> Atlas learning workspace
            </span>
            <span>Synthetic data. Real discoveries.</span>
          </footer>
        </main>
      </div>
      {modal && (
        <Modal modal={modal} close={() => setModal(null)} save={save} defects={defects} />
      )}
    </div>
  );
}
function SalesTable({ data, compact, admin, onMore, edit, remove }) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>{compact ? "Recent activity" : "Sales records"}</h2>
          <p>
            {compact
              ? "The first records in your selected period"
              : "Net revenue = quantity × unit price × (1 − discount / 100)"}
          </p>
        </div>
        {compact && (
          <button className="text" onClick={onMore}>
            View all sales
            <ArrowRight size={14} />
          </button>
        )}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>SALE / CUSTOMER</th>
              <th>DATE</th>
              <th>PRODUCT</th>
              <th>REGION</th>
              <th>REVENUE</th>
              {!compact && (
                <>
                  <th>QTY / DISCOUNT</th>
                  {admin && <th>ACTIONS</th>}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.items.slice(0, compact ? 5 : 10).map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.customer}</strong>
                  <small>SL-{String(r.id).padStart(4, "0")}</small>
                </td>
                <td>{r.date}</td>
                <td>{r.product}</td>
                <td>
                  <span className="region-tag">{r.region}</span>
                </td>
                <td className="numeric">{money(r.revenue)}</td>
                {!compact && (
                  <>
                    <td>
                      {r.quantity} / {r.discount}%
                    </td>
                    {admin && (
                      <td>
                        <button className="text" onClick={() => edit(r)}>
                          Edit
                        </button>
                        <button
                          className="danger-icon"
                          aria-label={"Delete sale " + r.id}
                          onClick={() => remove(r)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && (
          <p className="empty">
            No sales match these filters. Try a wider date range.
          </p>
        )}
      </div>
    </section>
  );
}
function Modal({ modal, close, save, defects }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { kind, row: r = {} } = modal,
    sale = kind === "sale",
    deletion = kind.startsWith("delete"),
    reset = kind === "reset";
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(e.target));
    if (sale)
      for (const k of ["quantity", "unit_price", "discount"])
        values[k] = Number(values[k]);
    else if (!reset && !deletion)
      for (const k of ["region", "start_date", "end_date"])
        if (!values[k]) values[k] = null;
    try {
      if (!(await save(values)))
        setError(
          "Could not save. Check your input and the workspace error message.",
        );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape" && !busy && !defects.ui_escape_ignored) close();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [busy, close, defects.ui_escape_ignored]);
  return (
    <div className="overlay">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <h2 id="modal-title">
            {reset
              ? "Reset training data?"
              : deletion
                ? "Delete this record?"
                : `${r.id ? "Edit" : "Create"} ${sale ? "sale" : "report"}`}
          </h2>
          <button aria-label="Close dialog" disabled={busy} onClick={close}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          {deletion ? (
            <p>
              This permanently deletes {r.name || `sale SL-${r.id}`}. Other
              records will be kept.
            </p>
          ) : reset ? (
            <>
              <p>
                All custom sales and reports will be removed. Everyone will be
                signed out.
              </p>
              <label>
                Type RESET TRAINING DATA
                <input
                  autoFocus
                  name="confirmation"
                  required
                  pattern="RESET TRAINING DATA"
                  placeholder="RESET TRAINING DATA"
                />
              </label>
            </>
          ) : (
            <>
              {sale ? (
                <>
                  <label>
                    Customer
                    <input
                      autoFocus
                      name="customer"
                      required
                      maxLength="100"
                      defaultValue={r.customer || ""}
                    />
                  </label>
                  <label>
                    Product
                    <input
                      name="product"
                      required
                      maxLength="100"
                      defaultValue={r.product || ""}
                    />
                  </label>
                  <label>
                    Date
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={r.date || "2026-04-30"}
                    />
                  </label>
                </>
              ) : (
                <label>
                  Report name
                  <input
                    autoFocus
                    name="name"
                    required
                    maxLength="100"
                    defaultValue={r.id && defects.ui_report_name_prefill ? `${r.name} (copy)` : r.name || ""}
                  />
                </label>
              )}
              <label>
                Region
                <select
                  name="region"
                  required={sale}
                  defaultValue={r.region || ""}
                >
                  <option value="">
                    {sale ? "Select region" : "All regions"}
                  </option>
                  {regions.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              {sale ? (
                <div className="form-row">
                  <label>
                    Quantity
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      max="10000"
                      step="1"
                      required
                      defaultValue={r.quantity || 1}
                    />
                  </label>
                  <label>
                    Unit price ($)
                    <input
                      type="number"
                      name="unit_price"
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      required
                      defaultValue={r.unit_price || 100}
                    />
                  </label>
                  <label>
                    Discount (%)
                    <input
                      type="number"
                      name="discount"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      defaultValue={r.discount ?? 0}
                    />
                  </label>
                </div>
              ) : (
                <div className="form-row">
                  <label>
                    Start date
                    <input
                      name="start_date"
                      type="date"
                      defaultValue={r.start_date || ""}
                    />
                  </label>
                  <label>
                    End date
                    <input
                      name="end_date"
                      type="date"
                      defaultValue={r.end_date || ""}
                    />
                  </label>
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={async () => {
                if (deletion && defects.ui_cancel_deletes) {
                  setBusy(true);
                  try { await save({}); } finally { setBusy(false); }
                } else close();
              }}
            >
              Cancel
            </button>
            <button
              className={reset || deletion ? "danger" : "primary"}
              disabled={busy}
            >
              {busy
                ? "Saving…"
                : reset
                  ? "Reset workspace"
                  : deletion
                    ? "Delete record"
                    : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
