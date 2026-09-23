/**
 * GET /api/standings?section=open|women[&team=India][&top=10]
 *
 * Team standings for an Olympiad section, trimmed for the overlay's ticker:
 * the top 10, extended to two places below the followed team — or, when that
 * team is far down, the team and the two below it returned separately as
 * `tail`.
 *
 * Source: the official chess-results table ("Rank after Round N"), which
 * places teams with FIDE's Olympiad tiebreaks — match points, then Olympiad
 * Sonneborn-Berger, then game points. It is published once a round is
 * complete, so it never shows a round half-played. If chess-results cannot be
 * read (down, throttling, or its page layout changed) this falls back to
 * Lichess's own team table so the ticker does not go dark on air; the
 * response says which it used.
 *
 * Neither source can be read from a browser directly — chess-results is HTML
 * on another origin, Lichess sends no CORS header — hence this relay. Cached at
 * the edge for five minutes: the official table only moves once a round, and
 * chess-results throttles clients that ask too often.
 */

/** chess-results tournament numbers for the 46th Olympiad */
const CHESS_RESULTS = {
  open: "1469895",
  men: "1469895",
  women: "1469896",
};

/** Lichess fallback: any tour in the section's broadcast group */
const LICHESS_TOURS = {
  open: "n1pPI5Q0",
  men: "n1pPI5Q0",
  women: "HtMn014k",
};

const MAX_TIE_OVERFLOW = 4;
/** Places shown below the followed team. */
const BELOW_TEAM = 2;
/** A team this few rows past the leaders is reached by extending the table. */
const NEAR_ROWS = 4;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
      if (code[0] === "#") {
        const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .trim();
}

/** "19,5" → 19.5 — chess-results writes decimals with a comma */
function number(text) {
  const value = Number(String(text).replace(",", "."));
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Parses chess-results' "Rank after Round N" page. Columns are found by their
 * headings rather than position, and anything unexpected throws — a layout
 * change should fall back to Lichess, not put a garbled table on air.
 */
async function fromChessResults(section) {
  const tournament = CHESS_RESULTS[section];
  if (!tournament) throw new Error("no chess-results tournament for section");

  // No `rd`: the page then shows the latest published round. `zeilen` lifts
  // the default 150-row limit so a team far down can still be found.
  const url = `https://chess-results.com/tnr${tournament}.aspx?lan=1&art=0&turdet=YES&flag=30&zeilen=99999`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (eval-bar standings relay)", Accept: "text/html" },
  });
  if (!response.ok) throw new Error(`chess-results ${response.status}`);
  const html = await response.text();

  const table = html.match(/<table[^>]*class="CRs1"[^>]*>([\s\S]*?)<\/table>/);
  if (!table) throw new Error("chess-results: no table");
  const rows = [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) => decode(cell[1]))
  );
  const header = rows.shift() || [];
  const col = (name) => header.indexOf(name);
  const at = { rank: col("Rk."), fed: col("FED"), team: col("Team"), mp: col("TB1"), gp: col("TB3") };
  if (Object.values(at).some((index) => index < 0)) throw new Error("chess-results: unexpected columns");

  // TB1 must be match points — check the legend rather than assume the order
  if (!/Tie Break1:\s*Matchpoints/i.test(html)) throw new Error("chess-results: TB1 is not match points");

  const standings = rows
    .filter((cells) => cells.length > at.gp && /^\d+$/.test(cells[at.rank]))
    .map((cells) => ({
      rank: Number(cells[at.rank]),
      name: cells[at.team],
      fed: cells[at.fed],
      mp: number(cells[at.mp]),
      gp: number(cells[at.gp]),
    }));
  if (standings.length === 0 || standings.some((row) => !row.name || Number.isNaN(row.mp))) {
    throw new Error("chess-results: could not read rows");
  }

  const round = decode(html).match(/Rank after Round (\d+)/i);
  return { source: "chess-results", rounds: round ? Number(round[1]) : 0, standings };
}

/**
 * Lichess's team table. Its order among teams level on points is not the
 * official one, so places here are shared on equal match and game points.
 */
async function fromLichess(section) {
  const tour = LICHESS_TOURS[section];
  if (!tour) throw new Error("no lichess tour for section");
  const response = await fetch(`https://lichess.org/broadcast/${tour}/teams/standings`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`lichess ${response.status}`);
  const rows = await response.json();

  let rank = 0;
  const standings = rows.map((row, index) => {
    const previous = rows[index - 1];
    if (!previous || previous.mp !== row.mp || previous.gp !== row.gp) rank = index + 1;
    return { rank, name: row.name, fed: "", mp: row.mp, gp: row.gp };
  });
  const rounds = rows.reduce(
    (most, row) => Math.max(most, (row.matches || []).filter((match) => typeof match.mp === "number").length),
    0
  );
  return { source: "lichess", rounds, standings };
}

module.exports = async function handler(req, res) {
  const section = String(req.query.section || "open").toLowerCase();
  const team = String(req.query.team || "").trim().toLowerCase();
  const top = Math.min(20, Math.max(1, Number(req.query.top) || 10));

  if (!CHESS_RESULTS[section]) {
    res.status(400).json({ error: "unknown section" });
    return;
  }

  let data;
  const problems = [];
  for (const source of [fromChessResults, fromLichess]) {
    try {
      data = await source(section);
      break;
    } catch (error) {
      problems.push(String(error.message || error));
    }
  }
  if (!data) {
    // Don't cache a failure; the ticker just skips its turn.
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: problems.join("; ") });
    return;
  }

  const { standings } = data;
  // Everyone placed `top` or better. Official places are unique, so this is
  // exactly the top 10; on the Lichess fallback a tie at the cut is shown
  // whole, capped because early on dozens of teams can share a place.
  const leaders = standings.filter((row) => row.rank <= top).slice(0, top + MAX_TIE_OVERFLOW);

  // The followed team and the two places below it — who is chasing. Close to
  // the leaders it just extends the table; far down it follows them after a
  // gap, so the ticker never crawls through thirty rows to reach it.
  let table = leaders;
  let tail = [];
  const at = team ? standings.findIndex((row) => row.name.toLowerCase() === team) : -1;
  if (at >= 0) {
    const end = at + BELOW_TEAM;
    if (at <= leaders.length + NEAR_ROWS) {
      table = standings.slice(0, Math.max(leaders.length, end + 1));
    } else {
      tail = standings.slice(at, end + 1);
    }
  }

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  res.status(200).json({
    section,
    source: data.source,
    rounds: data.rounds,
    teams: standings.length,
    top: table,
    tail,
    ...(problems.length ? { fallbackReason: problems[0] } : {}),
  });
};
