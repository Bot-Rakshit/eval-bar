import { TournamentSummary } from "../types";
import { isRecommended, pickCurrentRound, rankTournaments, roundStatus } from "./tournamentRank";

const NOW = 1_800_000_000_000;

function tour(
  name: string,
  tier: number,
  players: string,
  state: "live" | { startsInMin: number }
): TournamentSummary {
  const live = state === "live";
  return {
    id: name,
    name,
    description: "",
    image: null,
    url: "",
    tier,
    players,
    rounds: [
      { id: `${name}-1`, name: "Round 1", ongoing: false, finished: true, startsAt: NOW - 86_400_000 },
      {
        id: `${name}-2`,
        name: "Round 2",
        ongoing: live,
        finished: false,
        startsAt: live ? NOW - 3_600_000 : NOW + (state as { startsInMin: number }).startsInMin * 60_000,
      },
    ],
  };
}

describe("rankTournaments", () => {
  it("puts top-tier and star-studded events above youth sections", () => {
    const youth = ["G08", "O08", "G10"].map((section) => tour(`Youth ${section}`, 4, "", "live"));
    const cup = tour("Nations Cup Men", 4, "Nihal, Esipenko", { startsInMin: 20 });
    const elite = tour("World Championship", 5, "Gukesh, Sindarov", "live");
    const local = tour("City Open", 3, "", "live");

    const ranked = rankTournaments([local, ...youth, cup, elite]).map((t) => t.name);
    expect(ranked).toEqual(["World Championship", "Nations Cup Men", "Youth G08", "Youth O08", "Youth G10", "City Open"]);
  });

  it("puts live rounds before ones still to start, sooner starts first", () => {
    const later = tour("Later", 4, "", { startsInMin: 300 });
    const sooner = tour("Sooner", 4, "", { startsInMin: 30 });
    const live = tour("Live", 4, "", "live");
    expect(rankTournaments([later, sooner, live]).map((t) => t.name)).toEqual(["Live", "Sooner", "Later"]);
  });
});

describe("isRecommended", () => {
  it("takes tier 5, and tier 4 only with named players", () => {
    expect(isRecommended(tour("a", 5, "", "live"))).toBe(true);
    expect(isRecommended(tour("b", 4, "Giri", "live"))).toBe(true);
    expect(isRecommended(tour("c", 4, "", "live"))).toBe(false);
    expect(isRecommended(tour("d", 3, "Carlsen", "live"))).toBe(false);
  });
});

describe("pickCurrentRound / roundStatus", () => {
  it("follows the next round to start, not round 1", () => {
    const upcoming = tour("Cup", 4, "", { startsInMin: 40 });
    expect(pickCurrentRound(upcoming.rounds)?.name).toBe("Round 2");
    expect(roundStatus(upcoming, NOW)).toBe("Starts in 40 min · Round 2");
    expect(roundStatus(tour("Cup", 4, "", { startsInMin: 300 }), NOW)).toBe("Starts in 5 h · Round 2");
    expect(roundStatus(tour("Cup", 4, "", "live"), NOW)).toBe("Live · Round 2");
  });
});
