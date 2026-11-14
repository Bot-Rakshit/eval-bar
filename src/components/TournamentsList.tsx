import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { TournamentSummary } from "../types";
import { fetchLiveTournaments } from "../api/lichess";
import { isLive, isRecommended, pickCurrentRound, rankTournaments, roundStatus } from "../lib/tournamentRank";

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
  tournamentName?: string;
}

interface TournamentsListProps {
  onSelect: (selection: TournamentSelection) => void;
}

function extractRoundIdFromUrl(url: string): string {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** The long tail stays folded so the look settings below stay within reach. */
const OTHERS_SHOWN = 8;

const ShowMoreButton = styled.button`
  margin: 0.5rem 0 0;
  padding: 9px 18px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: ${TEXT};
  background: ${PANEL_BG};
  border: 1px solid ${PANEL_BORDER};
  border-radius: 10px;
  cursor: pointer;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: ${ACCENT};
    }
  }
`;

const SectionTitle = styled.h3`
  align-self: flex-start;
  margin: 1.25rem 0 0.25rem;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${TEXT_MUTED};
`;

const StatusRow = styled.div<{ $live: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8em;
  font-weight: 700;
  color: ${(props) => (props.$live ? "#4ade80" : TEXT_MUTED)};

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    opacity: ${(props) => (props.$live ? 1 : 0.6)};
  }
`;

const Players = styled.p`
  margin: 0;
  font-size: 0.85em;
  font-weight: 600;
  color: ${TEXT};
  opacity: 0.85;
`;

export function TournamentsList({ onSelect }: TournamentsListProps) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAllOthers, setShowAllOthers] = useState(false);

  useEffect(() => {
    fetchLiveTournaments()
      .then(setTournaments)
      .catch((error) => console.error("Error fetching tournaments:", error))
      .finally(() => setIsLoading(false));
  }, []);

  const ranked = useMemo(() => rankTournaments(tournaments), [tournaments]);
  const query = searchTerm.trim().toLowerCase();
  const filteredTournaments = query
    ? ranked.filter(
        (tournament) =>
          tournament.name.toLowerCase().includes(query) ||
          tournament.players.toLowerCase().includes(query)
      )
    : ranked;
  const recommended = filteredTournaments.filter(isRecommended);
  const others = filteredTournaments.filter((tournament) => !isRecommended(tournament));

  const selectTournament = (tournament: TournamentSummary) => {
    const round = pickCurrentRound(tournament.rounds);
    if (!round) return;
    setSelectedTournamentId(tournament.id);
    onSelect({ tournamentId: tournament.id, roundId: round.id, tournamentName: tournament.name });
  };

  const selectCustomUrl = () => {
    const roundId = extractRoundIdFromUrl(customUrl);
    if (!roundId) return;
    onSelect({ tournamentId: roundId, roundId });
  };

  const renderCard = (tournament: TournamentSummary) => (
    <Card
      key={tournament.id}
      selected={selectedTournamentId === tournament.id}
      onClick={() => selectTournament(tournament)}
    >
      <SelectIndicator selected={selectedTournamentId === tournament.id} />
      {tournament.image && <img className="card-image" src={tournament.image} alt="Tournament" />}
      <CardHeader>
        <CardTitle>{tournament.name}</CardTitle>
      </CardHeader>
      <StatusRow $live={isLive(tournament)}>{roundStatus(tournament)}</StatusRow>
      {tournament.players && <Players>{tournament.players}</Players>}
      {tournament.description && <CardDescription>{tournament.description}</CardDescription>}
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
  );

  return (
    <TournamentsWrapper>
      <Title>Broadcasts</Title>
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
          No broadcasts live or starting soon — paste a custom Lichess URL above.
        </NoBroadcastsMessage>
      )}

      {recommended.length > 0 && <SectionTitle>Recommended</SectionTitle>}
      {recommended.map(renderCard)}
      {others.length > 0 && recommended.length > 0 && <SectionTitle>All broadcasts</SectionTitle>}
      {(showAllOthers || query ? others : others.slice(0, OTHERS_SHOWN)).map(renderCard)}
      {!showAllOthers && !query && others.length > OTHERS_SHOWN && (
        <ShowMoreButton type="button" onClick={() => setShowAllOthers(true)}>
          Show all {others.length} broadcasts
        </ShowMoreButton>
      )}
    </TournamentsWrapper>
  );
}

export default TournamentsList;
