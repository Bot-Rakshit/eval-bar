import { useEffect, useState } from "react";
import styled from "styled-components";
import { RoundInfo, TournamentSummary } from "../types";
import { fetchLiveTournaments } from "../api/lichess";

const ACCENT = "#E79D29";
const ACCENT_STRONG = "#f2b04a";
const ACCENT_SOFT = "rgba(231, 157, 41, 0.16)";
const TEXT = "#f4f4f5";
const TEXT_MUTED = "#9b9ba1";
const PANEL_BG = "rgba(255, 255, 255, 0.045)";
const PANEL_BORDER = "rgba(255, 255, 255, 0.09)";

const TournamentsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 720px;
  margin: 1.5rem auto 0;
  padding: 0 16px;
  box-sizing: border-box;
`;

const NoBroadcastsMessage = styled.p`
  color: ${TEXT_MUTED};
  font-size: 0.9em;
  text-align: center;
`;

const Card = styled.div<{ selected: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  padding: 1.1rem 1.25rem;
  margin: 0.5rem 0;
  border-radius: 14px;
  cursor: pointer;
  background: ${PANEL_BG};
  border: 1px solid ${(props) => (props.selected ? ACCENT : PANEL_BORDER)};
  transition: border-color 160ms ease, background-color 160ms ease, transform 120ms ease;

  &:active {
    transform: scale(0.99);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: ${ACCENT};
    }
  }

  .card-image {
    width: 100%;
    height: auto;
    border-radius: 10px;
    margin-bottom: 0.5rem;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  width: 100%;
`;

const CardTitle = styled.h2`
  font-size: 1.05em;
  font-weight: 700;
  color: ${TEXT};
  margin: 0;
`;

const CardDescription = styled.p`
  font-size: 0.85em;
  color: ${TEXT_MUTED};
  margin: 0;
  max-height: 4em;
  overflow: hidden;
`;

const WebsiteLink = styled.a`
  align-self: flex-start;
  margin-top: 0.4rem;
  font-size: 0.8em;
  font-weight: 700;
  color: ${ACCENT};
  text-decoration: none;
  padding: 5px 12px;
  border: 1px solid ${ACCENT};
  border-radius: 8px;
  transition: background-color 160ms ease, color 160ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${ACCENT_SOFT};
    }
  }
`;

const Title = styled.h1`
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${ACCENT};
  margin: 0 0 1.5rem;
`;

const SearchWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 1.5rem;
  width: 100%;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 160px;
  padding: 9px 14px;
  font: inherit;
  font-size: 13px;
  color: ${TEXT};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid ${PANEL_BORDER};
  border-radius: 10px;
  outline: none;
  transition: border-color 160ms ease;

  &:focus {
    border-color: ${ACCENT};
  }

  &::placeholder {
    color: ${TEXT_MUTED};
  }
`;

const SearchButton = styled.button`
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 18px;
  border-radius: 10px;
  border: 1px solid ${ACCENT};
  background: ${ACCENT};
  color: #161616;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, transform 120ms ease;

  &:active {
    transform: scale(0.97);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${ACCENT_STRONG};
      border-color: ${ACCENT_STRONG};
    }
  }
`;

const SelectIndicator = styled.span<{ selected: boolean }>`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.selected ? ACCENT : PANEL_BORDER)};
  background: ${(props) => (props.selected ? ACCENT : "transparent")};
  transition: background-color 160ms ease, border-color 160ms ease;
`;

export interface TournamentSelection {
  tournamentId: string;
  roundId: string;
}

interface TournamentsListProps {
  onSelect: (selection: TournamentSelection) => void;
}

function extractRoundIdFromUrl(url: string): string {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function pickCurrentRound(rounds: RoundInfo[]): RoundInfo | null {
  return rounds.find((round) => round.ongoing) ?? rounds[0] ?? null;
}

export function TournamentsList({ onSelect }: TournamentsListProps) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLiveTournaments()
      .then(setTournaments)
      .catch((error) => console.error("Error fetching tournaments:", error))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredTournaments = searchTerm
    ? tournaments.filter((tournament) =>
        tournament.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tournaments;

  const selectTournament = (tournament: TournamentSummary) => {
    const round = pickCurrentRound(tournament.rounds);
    if (!round) return;
    setSelectedTournamentId(tournament.id);
    onSelect({ tournamentId: tournament.id, roundId: round.id });
  };

  const selectCustomUrl = () => {
    const roundId = extractRoundIdFromUrl(customUrl);
    if (!roundId) return;
    onSelect({ tournamentId: roundId, roundId });
  };

  return (
    <TournamentsWrapper>
      <Title>Live Broadcasts</Title>
      <SearchWrapper>
        <SearchInput
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search tournaments..."
        />
        <SearchInput
          value={customUrl}
          onChange={(event) => setCustomUrl(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && selectCustomUrl()}
          placeholder="Enter custom Lichess URL..."
        />
        <SearchButton onClick={selectCustomUrl}>Go</SearchButton>
      </SearchWrapper>

      {isLoading && <NoBroadcastsMessage>Loading live broadcasts…</NoBroadcastsMessage>}
      {!isLoading && filteredTournaments.length === 0 && (
        <NoBroadcastsMessage>
          No live broadcasts right now — paste a custom Lichess URL above.
        </NoBroadcastsMessage>
      )}

      {filteredTournaments.map((tournament) => (
        <Card
          key={tournament.id}
          selected={selectedTournamentId === tournament.id}
          onClick={() => selectTournament(tournament)}
        >
          <SelectIndicator selected={selectedTournamentId === tournament.id} />
          {tournament.image && (
            <img className="card-image" src={tournament.image} alt="Tournament" />
          )}
          <CardHeader>
            <CardTitle>{tournament.name}</CardTitle>
          </CardHeader>
          {tournament.description && (
            <CardDescription>{tournament.description}</CardDescription>
          )}
          {tournament.url && (
            <WebsiteLink
              href={tournament.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              Official Website
            </WebsiteLink>
          )}
        </Card>
      ))}
    </TournamentsWrapper>
  );
}

export default TournamentsList;
