import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Lock,
  Unlock,
  User,
  LogOut,
  Check,
  X,
  Clock,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

// ---------- Config ----------
const ADMIN_PIN = "7373"; // PIN maestro de administrador (Fernando)

// 👇 Pega aquí el link de la quiniela de Liga MX. Aparece como botón cuando se
// revela al campeón del Mundial, para invitar a la banda a seguir jugando.
const LIGA_MX_JOIN_URL = "";

const ROUND_DEFS = [
  { key: "r16", label: "Dieciseisavos", points: 1, slots: 16 },
  { key: "r8", label: "Octavos", points: 2, slots: 8 },
  { key: "r4", label: "Cuartos", points: 3, slots: 4 },
  { key: "r2", label: "Semis", points: 5, slots: 2 },
  { key: "r1", label: "Final", points: 8, slots: 1 },
];

const METHODS = [
  { key: "regular", label: "Tiempo regular" },
  { key: "et", label: "Tiempo extra" },
  { key: "pens", label: "Penales" },
];
const METHOD_BONUS = 1; // puntos extra si aciertan ganador Y método

const emptyMatch = (id) => ({
  id,
  teamA: "",
  teamB: "",
  winner: null,
  locked: false,
  result: null,
  resultMethod: null,
});

function defaultRoundsState() {
  const state = {};
  ROUND_DEFS.forEach((r) => {
    state[r.key] = {
      status: "pending", // pending -> open -> closed -> revealed
      matches: Array.from({ length: r.slots }, (_, i) => emptyMatch(`${r.key}-${i}`)),
    };
  });
  return state;
}

// ---------- Storage helpers ----------
async function safeGet(key, shared) {
  try {
    const res = await window.storage.get(key, shared);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}
async function safeSet(key, value, shared) {
  try {
    return await window.storage.set(key, JSON.stringify(value), shared);
  } catch {
    return false;
  }
}

// ---------- Celebración de campeón ----------
const CONFETTI_COLORS = ["#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#a78bfa", "#f87171"];

function ChampionCelebration({ name, joinUrl, top = [] }) {
  const pieces = Array.from({ length: 44 });
  const medals = ["🥇", "🥈", "🥉"];
  const podiumStyles = [
    "bg-amber-400/10 border-amber-400/40",
    "bg-neutral-400/10 border-neutral-500/40",
    "bg-orange-700/15 border-orange-600/40",
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-500/15 via-neutral-900 to-neutral-900 p-6 text-center mb-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {pieces.map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${(i / pieces.length) * 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 11) * 0.28}s`,
              animationDuration: `${2.6 + (i % 5) * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative">
        <div className="champion-trophy mx-auto mb-2 w-fit">
          <Trophy className="w-14 h-14 text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.6)]" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80">
          Campeón del Mundial
        </p>
        <h2 className="champion-name text-3xl font-extrabold mt-1 break-words">{name}</h2>
        <p className="text-sm text-neutral-400 mt-1 mb-5">¡Se acabó el torneo! 🎉🏆</p>

        {top.length > 0 && (
          <div className="border-t border-neutral-800 pt-4 mb-1 text-left">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-3 text-center">
              Top 3 de la quiniela
            </p>
            <div className="space-y-2">
              {top.map((p, i) => (
                <div
                  key={p.name}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${podiumStyles[i] || "border-neutral-800"}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg leading-none">{medals[i] || `${i + 1}.`}</span>
                    <span className="text-sm font-semibold truncate">{p.name}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 shrink-0">{p.total} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-neutral-800 pt-4 mt-4">
          <p className="text-sm text-neutral-300 mb-3">
            ¿Le seguimos? Únete al grupo de la <span className="font-semibold">Quiniela de Liga MX</span>.
          </p>
          <a
            href={joinUrl || "#"}
            target={joinUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 w-full font-semibold rounded-lg py-2.5 transition-colors ${
              joinUrl
                ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
                : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
            }`}
            onClick={(e) => !joinUrl && e.preventDefault()}
          >
            Unirme a la Quiniela de Liga MX →
          </a>
          {!joinUrl && (
            <p className="text-[11px] text-neutral-600 mt-2">
              (Configura el link en <code>LIGA_MX_JOIN_URL</code>.)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuinielaApp() {
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null); // shared state: rounds + matches
  const [players, setPlayers] = useState({}); // shared: { name: { pin, } }
  const [picks, setPicks] = useState({}); // shared: { name: { r16: {matchId: winner}, ... } }

  const [session, setSession] = useState(null); // { name } once logged in
  const [isAdmin, setIsAdmin] = useState(false);

  const [loginName, setLoginName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState("picks");
  const [saveStatus, setSaveStatus] = useState("");

  // ---------- Load shared data ----------
  const loadAll = useCallback(async () => {
    const t = await safeGet("tournament-state", true);
    const p = await safeGet("players-registry", true);
    const pk = await safeGet("all-picks", true);
    setTournament(t || { rounds: defaultRoundsState(), currentRound: "r16" });
    setPlayers(p || {});
    setPicks(pk || {});
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAll, 8000); // poll for live updates
    return () => clearInterval(iv);
  }, [loadAll]);

  function flashSave(msg = "Guardado ✓") {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(""), 1500);
  }

  // ---------- Auth ----------
  async function handleLogin() {
    setLoginError("");
    const name = loginName.trim();
    if (!name) return setLoginError("Escribe tu nombre");
    if (!/^\d{4}$/.test(loginPin)) return setLoginError("El PIN debe ser de 4 dígitos");

    if (name.toLowerCase() === "admin") {
      if (loginPin === ADMIN_PIN) {
        setIsAdmin(true);
        setSession({ name: "Admin" });
        return;
      }
      return setLoginError("PIN de administrador incorrecto");
    }

    const existing = players[name];
    if (existing) {
      if (existing.pin !== loginPin) return setLoginError("Nombre y PIN no coinciden");
      setSession({ name });
      setIsAdmin(false);
    } else {
      // create new player account
      const updated = { ...players, [name]: { pin: loginPin, createdAt: Date.now() } };
      setPlayers(updated);
      await safeSet("players-registry", updated, true);
      setSession({ name });
      setIsAdmin(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setIsAdmin(false);
    setLoginName("");
    setLoginPin("");
    setActiveTab("picks");
  }

  // ---------- Picks logic ----------
  // pick shape per match: { winner, method }
  async function setPick(playerName, roundKey, matchId, partial) {
    const roundPicks = (picks[playerName] || {})[roundKey] || {};
    const existing = roundPicks[matchId] || { winner: null, method: null };
    const updated = {
      ...picks,
      [playerName]: {
        ...(picks[playerName] || {}),
        [roundKey]: {
          ...roundPicks,
          [matchId]: { ...existing, ...partial },
        },
      },
    };
    setPicks(updated);
    const ok = await safeSet("all-picks", updated, true);
    flashSave(ok ? "Guardado ✓" : "Error al guardar");
  }

  // ---------- Admin actions ----------
  async function updateTournament(next) {
    setTournament(next);
    await safeSet("tournament-state", next, true);
  }

  function updateMatchField(roundKey, matchId, field, value) {
    const next = structuredClone(tournament);
    const round = next.rounds[roundKey];
    const m = round.matches.find((m) => m.id === matchId);
    m[field] = value;
    updateTournament(next);
  }

  function setRoundStatus(roundKey, status) {
    const next = structuredClone(tournament);
    next.rounds[roundKey].status = status;
    updateTournament(next);
    flashSave(
      status === "open"
        ? "Ronda abierta — ya pueden pronosticar"
        : status === "closed"
        ? "Ronda cerrada — picks bloqueados"
        : status === "revealed"
        ? "Resultados revelados"
        : "Actualizado"
    );
  }

  function addMatchSlot(roundKey) {
    const next = structuredClone(tournament);
    const round = next.rounds[roundKey];
    round.matches.push(emptyMatch(`${roundKey}-${Date.now()}`));
    updateTournament(next);
  }

  function removeMatchSlot(roundKey, matchId) {
    const next = structuredClone(tournament);
    next.rounds[roundKey].matches = next.rounds[roundKey].matches.filter(
      (m) => m.id !== matchId
    );
    updateTournament(next);
  }

  // ---------- Scoring ----------
  function computeStandings() {
    const totals = {};
    Object.keys(players).forEach((name) => (totals[name] = { total: 0, byRound: {} }));
    ROUND_DEFS.forEach((rd) => {
      const round = tournament.rounds[rd.key];
      if (round.status !== "revealed") return;
      Object.entries(picks).forEach(([name, byRound]) => {
        if (!totals[name]) totals[name] = { total: 0, byRound: {} };
        const roundPicks = byRound[rd.key] || {};
        let pts = 0;
        round.matches.forEach((m) => {
          const pick = roundPicks[m.id];
          if (m.result && pick && pick.winner === m.result) {
            pts += rd.points;
            if (m.resultMethod && pick.method && pick.method === m.resultMethod) {
              pts += METHOD_BONUS;
            }
          }
        });
        totals[name].byRound[rd.key] = pts;
        totals[name].total += pts;
      });
    });
    return Object.entries(totals)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }

  // ---------- Render: Loading ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // ---------- Render: Login ----------
  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Trophy className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">Quiniela Mundial</h1>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Tu nombre</label>
              <input
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Ej. Fernando"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">PIN (4 dígitos)</label>
              <input
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••"
                type="password"
                inputMode="numeric"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest"
              />
            </div>
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg py-2.5 transition-colors"
            >
              Entrar
            </button>
            <p className="text-xs text-neutral-500 text-center">
              Primera vez aquí — escribe tu nombre y crea tu PIN; tu cuenta se crea sola.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Shared layout pieces ----------
  const standings = computeStandings();
  const currentRoundKey = tournament.currentRound;

  function RoundStatusBadge({ status }) {
    const map = {
      pending: { label: "Por abrir", icon: Clock, cls: "bg-neutral-800 text-neutral-400" },
      open: { label: "Abierta", icon: Unlock, cls: "bg-emerald-500/20 text-emerald-400" },
      closed: { label: "Cerrada", icon: Lock, cls: "bg-amber-500/20 text-amber-400" },
      revealed: { label: "Resultados visibles", icon: Check, cls: "bg-blue-500/20 text-blue-400" },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${s.cls}`}>
        <Icon className="w-3 h-3" /> {s.label}
      </span>
    );
  }

  // ---------- Admin View ----------
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">Panel Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-neutral-400 hover:text-neutral-100 flex items-center gap-1 text-sm"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </header>

        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-20">
          {saveStatus && (
            <div className="text-emerald-400 text-sm bg-emerald-500/10 rounded-lg px-3 py-2">
              {saveStatus}
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-neutral-400 mb-2 uppercase tracking-wide">
              Ronda actual
            </h2>
            <select
              value={currentRoundKey}
              onChange={(e) => updateTournament({ ...tournament, currentRound: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100"
            >
              {ROUND_DEFS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} ({r.points} pts/acierto)
                </option>
              ))}
            </select>
          </div>

          {ROUND_DEFS.map((rd) => {
            const round = tournament.rounds[rd.key];
            const isCurrent = rd.key === currentRoundKey;
            return (
              <div
                key={rd.key}
                className={`bg-neutral-900 border rounded-2xl p-4 ${
                  isCurrent ? "border-emerald-500/50" : "border-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{rd.label}</h3>
                    <RoundStatusBadge status={round.status} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setRoundStatus(rd.key, "open")}
                      className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => setRoundStatus(rd.key, "closed")}
                      className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => setRoundStatus(rd.key, "revealed")}
                      className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      Revelar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {round.matches.map((m, idx) => (
                    <div key={m.id} className="bg-neutral-800/60 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 w-5">{idx + 1}.</span>
                        <input
                          value={m.teamA}
                          onChange={(e) => updateMatchField(rd.key, m.id, "teamA", e.target.value)}
                          placeholder="Equipo A"
                          className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm"
                        />
                        <span className="text-neutral-500 text-xs">vs</span>
                        <input
                          value={m.teamB}
                          onChange={(e) => updateMatchField(rd.key, m.id, "teamB", e.target.value)}
                          placeholder="Equipo B"
                          className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm"
                        />
                        <button
                          onClick={() => removeMatchSlot(rd.key, m.id)}
                          className="text-neutral-600 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-7">
                        <span className="text-xs text-neutral-500">Resultado real:</span>
                        <select
                          value={m.result || ""}
                          onChange={(e) =>
                            updateMatchField(rd.key, m.id, "result", e.target.value || null)
                          }
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs flex-1"
                        >
                          <option value="">Sin definir</option>
                          {m.teamA && <option value={m.teamA}>{m.teamA}</option>}
                          {m.teamB && <option value={m.teamB}>{m.teamB}</option>}
                        </select>
                      </div>
                      {m.result && (
                        <div className="flex items-center gap-2 pl-7">
                          <span className="text-xs text-neutral-500">¿Cómo ganó?</span>
                          <select
                            value={m.resultMethod || ""}
                            onChange={(e) =>
                              updateMatchField(rd.key, m.id, "resultMethod", e.target.value || null)
                            }
                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs flex-1"
                          >
                            <option value="">Sin definir</option>
                            {METHODS.map((meth) => (
                              <option key={meth.key} value={meth.key}>
                                {meth.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addMatchSlot(rd.key)}
                    className="text-xs text-neutral-400 hover:text-emerald-400 flex items-center gap-1 mt-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar partido
                  </button>
                </div>
              </div>
            );
          })}

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <h3 className="font-semibold mb-2">
              Jugadores registrados ({Object.keys(players).length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(players).map((n) => (
                <span
                  key={n}
                  className="text-xs bg-neutral-800 px-2 py-1 rounded-full text-neutral-300"
                >
                  {n}
                </span>
              ))}
              {Object.keys(players).length === 0 && (
                <span className="text-xs text-neutral-500">Nadie se ha registrado todavía.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Player View ----------
  const myPicks = picks[session.name] || {};
  const round = tournament.rounds[currentRoundKey];
  const roundDef = ROUND_DEFS.find((r) => r.key === currentRoundKey);
  const canPick = round.status === "open";

  // Campeón: cuando la Final (r1) está revelada y ya tiene resultado.
  const finalRound = tournament.rounds.r1;
  const champion =
    finalRound && finalRound.status === "revealed" && finalRound.matches[0]?.result
      ? finalRound.matches[0].result
      : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold">Quiniela Mundial</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400 flex items-center gap-1">
            <User className="w-4 h-4" /> {session.name}
          </span>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-neutral-100">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <nav className="flex border-b border-neutral-800 px-4">
        {[
          { key: "picks", label: "Mis Pronósticos" },
          { key: "standings", label: "Tabla" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-neutral-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-4 max-w-lg mx-auto pb-24">
        {saveStatus && (
          <div className="text-emerald-400 text-sm bg-emerald-500/10 rounded-lg px-3 py-2 mb-4">
            {saveStatus}
          </div>
        )}

        {champion && (
          <ChampionCelebration
            name={champion}
            joinUrl={LIGA_MX_JOIN_URL}
            top={standings.slice(0, 3)}
          />
        )}

        {activeTab === "picks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{roundDef?.label}</h2>
                <p className="text-xs text-neutral-500">
                  {roundDef?.points} pts por acierto · +{METHOD_BONUS} si aciertas cómo ganó
                </p>
              </div>
              <RoundStatusBadge status={round.status} />
            </div>

            {round.status === "pending" && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-neutral-400">
                <Clock className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                Esta ronda todavía no abre. Espera a que el admin la habilite.
              </div>
            )}

            {round.status === "closed" && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center text-amber-400">
                <Lock className="w-6 h-6 mx-auto mb-2" />
                Ronda cerrada. Ya no se pueden cambiar pronósticos.
              </div>
            )}

            {(round.status === "open" || round.status === "closed" || round.status === "revealed") &&
              round.matches.map((m, idx) => {
                const pick = myPicks[currentRoundKey]?.[m.id] || { winner: null, method: null };
                const hasTeams = m.teamA && m.teamB;
                const revealed = round.status === "revealed";
                const correctWinner = revealed && m.result && pick.winner === m.result;
                const correctMethod =
                  revealed && m.resultMethod && pick.method === m.resultMethod && correctWinner;

                return (
                  <div
                    key={m.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Partido {idx + 1}</span>
                      {revealed && m.result && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            correctWinner
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {correctWinner ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {correctWinner ? "Acertaste" : "Fallaste"}
                        </span>
                      )}
                    </div>

                    {!hasTeams ? (
                      <p className="text-sm text-neutral-500 italic">Partido por definir…</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {[m.teamA, m.teamB].map((team) => {
                            const selected = pick.winner === team;
                            const isResult = revealed && m.result === team;
                            return (
                              <button
                                key={team}
                                disabled={!canPick}
                                onClick={() => setPick(session.name, currentRoundKey, m.id, { winner: team })}
                                className={`min-w-0 break-words rounded-lg px-3 py-2.5 text-sm font-medium border transition-colors ${
                                  selected
                                    ? "bg-emerald-500 text-neutral-950 border-emerald-500"
                                    : "bg-neutral-800 text-neutral-200 border-neutral-700 hover:border-neutral-600"
                                } ${!canPick ? "opacity-80 cursor-default" : ""} ${
                                  isResult ? "ring-2 ring-blue-400" : ""
                                }`}
                              >
                                {team}
                                {isResult && <span className="block text-[10px] text-blue-300">ganador real</span>}
                              </button>
                            );
                          })}
                        </div>

                        <div>
                          <p className="text-xs text-neutral-500 mb-1">¿Cómo crees que gana?</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {METHODS.map((meth) => {
                              const selected = pick.method === meth.key;
                              const isResult = revealed && m.resultMethod === meth.key;
                              return (
                                <button
                                  key={meth.key}
                                  disabled={!canPick}
                                  onClick={() =>
                                    setPick(session.name, currentRoundKey, m.id, { method: meth.key })
                                  }
                                  className={`min-w-0 whitespace-normal leading-tight rounded-lg px-2 py-1.5 text-xs border transition-colors ${
                                    selected
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                      : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-600"
                                  } ${!canPick ? "opacity-80 cursor-default" : ""} ${
                                    isResult ? "ring-2 ring-blue-400" : ""
                                  }`}
                                >
                                  {meth.label}
                                </button>
                              );
                            })}
                          </div>
                          {correctMethod && (
                            <p className="text-[11px] text-emerald-400 mt-1">
                              +{METHOD_BONUS} bonus por método ✓
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {activeTab === "standings" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">Tabla de posiciones</h2>
            {standings.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-neutral-400">
                Todavía no hay puntos. Aparecerán cuando el admin revele resultados.
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                {standings.map((s, i) => (
                  <div
                    key={s.name}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i !== standings.length - 1 ? "border-b border-neutral-800" : ""
                    } ${s.name === session.name ? "bg-emerald-500/5" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 text-center text-sm font-bold ${
                          i === 0
                            ? "text-yellow-400"
                            : i === 1
                            ? "text-neutral-300"
                            : i === 2
                            ? "text-amber-600"
                            : "text-neutral-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">
                        {s.name}
                        {s.name === session.name && (
                          <span className="text-emerald-400 text-xs ml-1">(tú)</span>
                        )}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{s.total} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
