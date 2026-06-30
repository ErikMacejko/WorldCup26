import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import {
  buildWeeks,
  currentWeekIndex,
  stageLabel,
  flag,
  teamCode,
  fmtDateTime,
  fmtTime,
} from '../../lib/format.js';

function matchExtra(match) {
  if (!match?.matchDuration || !match.result) return null;
  if (match.matchDuration === 'PENALTY_SHOOTOUT' && match.result.penaltyHome != null) {
    return `pen. ${match.result.penaltyHome}:${match.result.penaltyAway}`;
  }
  if (match.matchDuration === 'EXTRA_TIME') return 'po pred.';
  return null;
}

function ScoreBadge({ result, extra }) {
  if (!result) return null;
  return (
    <span className="result-badge">
      {result.home} : {result.away}
      {extra && <span className="result-extra">{extra}</span>}
    </span>
  );
}

function OthersTips({ match }) {
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!tips) {
      setLoading(true);
      try {
        const data = await api.matchTips(match.id);
        setTips(data.tips);
      } catch {
        setTips([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="others">
      <button className="btn-link" onClick={toggle}>
        {open ? '▾ Skryť tipy ostatných' : '▸ Zobraziť tipy ostatných'}
      </button>
      {open && (
        <div className="others-list">
          {loading && <div className="muted">Načítavam…</div>}
          {!loading && tips && tips.length === 0 && (
            <div className="muted">Zatiaľ nikto netipoval.</div>
          )}
          {!loading &&
            tips &&
            tips.map((t, i) => (
              <div key={i} className="others-row">
                <span className="nick">{t.nickname}</span>
                <span className="tip">
                  {t.homeScore} : {t.awayScore}
                </span>
                <span className="pts">
                  {t.points != null ? `${t.points} b` : ''}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, myPred, onSaved }) {
  const [home, setHome] = useState(myPred?.homeScore ?? '');
  const [away, setAway] = useState(myPred?.awayScore ?? '');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setHome(myPred?.homeScore ?? '');
    setAway(myPred?.awayScore ?? '');
  }, [myPred?.homeScore, myPred?.awayScore]);

  const locked = match.locked;
  // An admin can grant individual players a one-shot back-fill for a locked
  // match; submitting consumes the grant (see predictions.js).
  const editable = !locked || match.canBackfill;

  // Only allow 0-99 (at most two digits) while typing.
  function handleScoreChange(setter) {
    return (e) => {
      const v = e.target.value;
      if (/^[0-9]{0,2}$/.test(v)) setter(v);
    };
  }

  async function save() {
    setError('');
    if (home === '' || away === '') {
      setError('Vyplň oba výsledky.');
      return;
    }
    setSaving(true);
    try {
      const saved = await api.savePrediction(match.id, Number(home), Number(away));
      onSaved(match.id, saved);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      if (err.code === 'locked') setError('Zápas je už uzamknutý.');
      else setError('Uloženie zlyhalo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`match-card ${locked ? 'locked' : ''}`}>
      <div className="match-meta">
        <span className="stage">{stageLabel(match)}</span>
        <span className="kickoff">{fmtDateTime(match.kickoff)}</span>
        {match.venue && <span className="venue muted">{match.venue}</span>}
      </div>

      <div className="match-teams">
        <div className="team team-home">
          <span className="team-name">
            <span className="cc-full">{match.homeTeam}</span>
            <span className="cc-short">{teamCode(match.homeTeam)}</span>
          </span>
          <span className="flag">{flag(match.homeTeam)}</span>
        </div>

        <div className="score-box">
          {editable ? (
            <div className="score-inputs">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                maxLength={2}
                value={home}
                onChange={handleScoreChange(setHome)}
              />
              <span>:</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                maxLength={2}
                value={away}
                onChange={handleScoreChange(setAway)}
              />
            </div>
          ) : (
            <div className="locked-score">
              {myPred ? (
                <span className="my-tip">
                  {myPred.homeScore} : {myPred.awayScore}
                </span>
              ) : (
                <span className="my-tip muted">bez tipu</span>
              )}
            </div>
          )}
        </div>

        <div className="team team-away">
          <span className="flag">{flag(match.awayTeam)}</span>
          <span className="team-name">
            <span className="cc-full">{match.awayTeam}</span>
            <span className="cc-short">{teamCode(match.awayTeam)}</span>
          </span>
        </div>
      </div>

      {editable && (
        <div className="tip-deadline muted small">
          Na tento zápas môžeš tipovať do {fmtDateTime(match.lockAt)}
        </div>
      )}

      <div className="match-footer">
        {editable ? (
          <div className="save-block">
            {match.result && (
              <div className="muted small">
                Zápas už skončil ({match.result.home}:{match.result.away}{matchExtra(match) ? `, ${matchExtra(match)}` : ''}) — admin ti
                dočasne odomkol tipovanie, tip sa ihneď ohodnotí podľa výsledku.
              </div>
            )}
            <div className="save-row">
              <button className="btn-sm" onClick={save} disabled={saving}>
                {saving ? 'Ukladám…' : myPred ? 'Upraviť tip' : 'Uložiť tip'}
              </button>
              {savedFlash && <span className="ok">✓ uložené</span>}
              {myPred && !savedFlash && !locked && (
                <span className="muted small">
                  tvoj tip: {myPred.homeScore}:{myPred.awayScore}
                </span>
              )}
              {error && <span className="error small">{error}</span>}
            </div>
          </div>
        ) : (
          <div className="locked-info">
            {match.result && (
              <div className="locked-result">
                Výsledok: <ScoreBadge result={match.result} extra={matchExtra(match)} />
              </div>
            )}
            <div className="locked-bottom">
              <span className="lock">🔒 Tipovanie uzamknuté</span>
              {myPred?.points != null && (
                <span className={`pts-tag pts-${myPred.points}`}>
                  +{myPred.points} b
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {locked && <OthersTips match={match} />}
    </div>
  );
}

export default function MatchesTab() {
  const [matches, setMatches] = useState([]);
  const [mine, setMine] = useState({});
  const [loading, setLoading] = useState(true);
  const [weekIdx, setWeekIdx] = useState(0);
  const [initialised, setInitialised] = useState(false);

  async function load() {
    const [ms, mp] = await Promise.all([api.matches(), api.myPredictions()]);
    setMatches(ms);
    setMine(mp);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const weeks = useMemo(() => buildWeeks(matches), [matches]);

  useEffect(() => {
    if (!initialised && weeks.length > 0) {
      setWeekIdx(currentWeekIndex(weeks));
      setInitialised(true);
    }
  }, [weeks, initialised]);

  function onSaved(matchId, saved) {
    setMine((prev) => ({ ...prev, [matchId]: saved }));
    // A back-fill grant is consumed by the server on save — reflect that
    // immediately so the card switches back to read-only.
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, canBackfill: false } : m))
    );
  }

  if (loading) return <div className="center muted">Načítavam zápasy…</div>;
  if (weeks.length === 0) return <div className="center muted">Žiadne zápasy.</div>;

  const week = weeks[Math.min(weekIdx, weeks.length - 1)];
  const isCurrent = weekIdx === currentWeekIndex(weeks);

  return (
    <>
      <div className="week-nav">
        <button
          className="btn-ghost"
          disabled={weekIdx === 0}
          onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
        >
          Predošlý
        </button>
        <div className="week-title">
          <strong>Týždeň {week.index + 1}</strong>
          <span className="muted">{week.label}</span>
          {isCurrent && <span className="badge-now">aktuálny</span>}
        </div>
        <button
          className="btn-ghost"
          disabled={weekIdx >= weeks.length - 1}
          onClick={() => setWeekIdx((i) => Math.min(weeks.length - 1, i + 1))}
        >
          Ďalší
        </button>
      </div>

      {!isCurrent && (
        <button className="btn-link center-link" onClick={() => setWeekIdx(currentWeekIndex(weeks))}>
          ⤺ Späť na aktuálny týždeň
        </button>
      )}

      <div className="match-list">
        {week.matches.map((m) => (
          <MatchCard key={m.id} match={m} myPred={mine[m.id]} onSaved={onSaved} />
        ))}
      </div>
    </>
  );
}
