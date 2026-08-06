import React, { useState, useEffect } from "react";
import styled from "styled-components";

const ACCENT = "#E79D29";
const ACCENT_STRONG = "#f2b04a";
const TEXT = "#f4f4f5";
const TEXT_MUTED = "#9b9ba1";
const PANEL_BG = "rgba(255, 255, 255, 0.045)";
const PANEL_BORDER = "rgba(255, 255, 255, 0.09)";
const ACCENT_SOFT = "rgba(231, 157, 41, 0.16)";

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

const Card = styled.div`
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

const CardDate = styled.p`
  font-size: 0.8em;
  color: ${TEXT_MUTED};
  margin: 0;
  white-space: nowrap;
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

const SelectIndicator = styled.span`
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

const TournamentsList = ({ onSelect }) => {
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [customUrl, setCustomUrl] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [broadcasts, setBroadcasts] = useState(true);

  useEffect(() => {
    fetch("https://lichess.org/api/broadcast?nb=50")
      .then((response) => response.text())
      .then((data) => {
        // Robust NDJSON parsing with error handling for OBS browser compatibility
        const lines = data.trim().split("\n");
        const jsonData = [];
        for (const line of lines) {
          try {
            if (line.trim()) {
              jsonData.push(JSON.parse(line));
            }
          } catch (e) {
            console.warn("Failed to parse line:", line, e);
          }
        }
        const ongoingTournaments = jsonData.filter(
          (tournament) =>
            tournament.rounds &&
            tournament.rounds.some((round) => round.ongoing === true)
        );
        setTournaments(ongoingTournaments);
        setFilteredTournaments(ongoingTournaments);
        if (ongoingTournaments.length === 0) {
          setBroadcasts(false);
        }
      })
      .catch((error) =>
        console.error("Error fetching tournaments:", error)
      );
  }, []);

  useEffect(() => {
    document.body.classList.add('tournaments-list');
    return () => {
      document.body.classList.remove('tournaments-list');
    };
  }, []);

  const handleSearch = () => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = tournaments.filter((tournament) =>
      tournament.tour.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setFilteredTournaments(filtered);
  };

  const handleCustomUrlChange = (e) => {
    setCustomUrl(e.target.value);
    const urlParts = e.target.value.split("/");
    const id = urlParts[urlParts.length - 1];
    setTournamentId(id);
  };

  const onSelectTournament = () => {
    if (tournamentId) {
      onSelect({
        tournamentId: tournamentId,
        roundId: tournamentId, // For custom URLs, use the extracted ID as both tournamentId and roundId
        gameIDs: [] // We don't have game IDs for custom URLs, so leave this empty
      });
    } else {
      console.error("No tournament ID selected");
    }
  };

  const selectTournament = (tournament) => {
    setSelectedTournamentId(tournament.tour.id);
    const ongoingRound = tournament.rounds.find(
      (round) => round.ongoing === true
    ) || tournament.rounds[0];
    if (ongoingRound) {
      onSelect({
        tournamentId: tournament.tour.id,
        roundId: ongoingRound.id,
        gameIDs: ongoingRound.games ? ongoingRound.games.map(game => `${game.white.name}-vs-${game.black.name}`) : []
      });
    }
  };

  return (
    <TournamentsWrapper>
      <Title>Live Broadcasts</Title>
      <SearchWrapper>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search tournaments..."
        />
        <SearchButton onClick={handleSearch}>Search</SearchButton>

        <SearchInput
          value={customUrl}
          onChange={handleCustomUrlChange}
          onKeyDown={(e) => e.key === "Enter" && onSelectTournament()}
          placeholder="Enter custom Lichess URL..."
        />
        <SearchButton onClick={onSelectTournament}>Go</SearchButton>
      </SearchWrapper>
      {!broadcasts && (
        <NoBroadcastsMessage>
          No live broadcasts right now — paste a custom Lichess URL above.
        </NoBroadcastsMessage>
      )}
      {filteredTournaments.map((tournament) =>
        tournament.tour && tournament.rounds && tournament.rounds.length > 0 ? (
          <Card
            key={tournament.tour.id}
            selected={selectedTournamentId === tournament.tour.id}
            onClick={() => selectTournament(tournament)}
          >
            <SelectIndicator selected={selectedTournamentId === tournament.tour.id} />
            {tournament.image && (
              <img
                className="card-image"
                src={tournament.image}
                alt="Tournament"
              />
            )}
            <CardHeader>
              <CardTitle>{tournament.tour.name}</CardTitle>
              <CardDate>{tournament.tour.date}</CardDate>
            </CardHeader>
            <CardDescription>{tournament.tour.description}</CardDescription>
            <WebsiteLink
              href={tournament.tour.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Official Website
            </WebsiteLink>
          </Card>
        ) : null
      )}
    </TournamentsWrapper>
  );
};

export default TournamentsList;
