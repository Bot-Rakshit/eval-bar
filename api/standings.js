/**
 * GET /api/standings?section=open|women[&team=India][&top=10][&tour=<id>]
 *
 * Team standings for an Olympiad section, trimmed for the overlay's ticker:
 * the top 10 (a tie at 10th shown whole), extended to two places below the
 * followed team — or, when that team is far down, the team and the two below
 * it returned separately as `tail`.
 *
 * Lichess serves these at /broadcast/{tour}/teams/standings but without a CORS
 * header, so a browser page cannot read them directly — this relays them. The
 * full payload is ~240KB (every team, every player); the ticker needs the top
 * few rows, so the trimming happens here. Cached at the edge for two minutes so
 * a room full of viewers is one request to Lichess, not one each.
 *
 * Lichess counts a team's match and game points over decided matches only; the
 * match in progress is listed without a score. So these are live standings
 * through the last result, never a partial match.
 */

/** Any tour in the section works: the standings cover the whole section. */
const SECTION_TOURS = {
  open: "n1pPI5Q0",
  men: "n1pPI5Q0",
  women: "HtMn014k",
};

const TOUR_ID = /^[A-Za-z0-9]{8}$/;
const MAX_TIE_OVERFLOW = 4;
/** Places shown below the followed team. */
const BELOW_TEAM = 2;
/** A team this few rows past the leaders is reached by extending the table. */
const NEAR_ROWS = 4;

module.exports = async function handler(req, res) {
  const section = String(req.query.section || "open").toLowerCase();
  const tour = String(req.query.tour || SECTION_TOURS[section] || "");
  const team = String(req.query.team || "").trim().toLowerCase();
  const top = Math.min(20, Math.max(1, Number(req.query.top) || 10));

  if (!TOUR_ID.test(tour)) {
    res.status(400).json({ error: "unknown section or tour" });
    return;
  }

  let rows;
  try {
    const upstream = await fetch(`https://lichess.org/broadcast/${tour}/teams/standings`, {
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) throw new Error(`lichess ${upstream.status}`);
    rows = await upstream.json();
  } catch (error) {
    // Don't cache a failure; the ticker just skips its turn.
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(error.message || error) });
    return;
  }

  // Competition ranking over match points, then game points: teams level on
  // both share a place ("7, 7, 7, 10"). Lichess orders ties, but not by the
  // official tiebreaks, so a numbered place there would overstate it.
  const standings = [];
  let rank = 0;
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    if (!previous || previous.mp !== row.mp || previous.gp !== row.gp) rank = index + 1;
    standings.push({ rank, name: row.name, mp: row.mp, gp: row.gp });
  });

  const rounds = rows.reduce(
    (most, row) => Math.max(most, (row.matches || []).filter((match) => typeof match.mp === "number").length),
    0
  );
  // Everyone placed `top` or better, so a tie on the boundary is shown whole
  // rather than cut at an arbitrary row — capped, because after an early
  // round dozens of teams can share a place.
  const leaders = standings.filter((row) => row.rank <= top).slice(0, top + MAX_TIE_OVERFLOW);

  // The followed team and the two places below it — who is chasing. When that
  // run starts close to the leaders it simply extends the table; when the team
  // is far down it follows the leaders after a gap, so the ticker never has to
  // crawl through thirty rows to reach it.
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

  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
  res.status(200).json({ section, rounds, teams: standings.length, top: table, tail });
};
