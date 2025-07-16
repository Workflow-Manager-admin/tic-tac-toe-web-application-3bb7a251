import React, { useState, useEffect } from "react";
import "./App.css";

// Color variables for inline styles
const COLORS = {
  primary: "#1976d2",
  secondary: "#ffffff",
  accent: "#fbc02d"
};

// --- Helper Components ---

/**
 * GameBoard - Tic Tac Toe board component
 * @param {object} props - { board, onCellClick, locked }
 */
function GameBoard({ board, onCellClick, locked }) {
  // PUBLIC_INTERFACE
  /**
   * Renders the 3x3 tic tac toe board as buttons.
   * Locked disables all buttons.
   */
  return (
    <div
      className="ttt-board"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 60px)",
        gap: 8,
        justifyContent: "center",
        margin: "24px 0"
      }}
    >
      {board.map((v, i) => (
        <button
          key={i}
          className="ttt-cell"
          style={{
            width: 60,
            height: 60,
            background: COLORS.secondary,
            border: `2px solid ${COLORS.primary}`,
            color: v === "X" ? COLORS.primary : v === "O" ? COLORS.accent : "#888",
            fontSize: 32,
            fontWeight: "bold",
            borderRadius: 8,
            transition: "background 0.2s, color 0.2s"
          }}
          disabled={locked || v}
          onClick={() => onCellClick(i)}
          aria-label={`Cell ${i + 1}, ${v ? v : "empty"}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/**
 * GameHistorySidebar - Shows list of previous games
 */
function GameHistorySidebar({ history, onSelect, selectedGameId }) {
  // PUBLIC_INTERFACE
  /**
   * Renders the sidebar containing clickable previous game sessions.
   */
  return (
    <aside
      className="ttt-history-sidebar"
      style={{
        background: "#f8f9fa",
        borderLeft: `1px solid #e9ecef`,
        padding: 20,
        minWidth: 200,
        maxWidth: 260,
        overflowY: "auto",
        fontSize: 15
      }}
    >
      <div style={{ fontWeight: "bold", color: COLORS.primary, marginBottom: 10 }}>Game History</div>
      {history.length === 0 && <div style={{ color: "#888", fontSize: 14 }}>No games yet.</div>}

      <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
        {history.map((game) => (
          <li key={game.game_id} style={{ margin: "10px 0" }}>
            <button
              onClick={() => onSelect(game.game_id)}
              style={{
                background:
                  game.game_id === selectedGameId
                    ? COLORS.primary
                    : COLORS.secondary,
                color:
                  game.game_id === selectedGameId
                    ? COLORS.secondary
                    : COLORS.primary,
                border: `1px solid ${COLORS.primary}`,
                borderRadius: 6,
                padding: "6px 12px",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                fontWeight: game.game_id === selectedGameId ? "bold" : "normal"
              }}
            >
              #{String(game.game_id).padStart(5, "0")}
              {"  "} {game.status === "finished" ? "🏁" : ""}
              <span style={{ float: 'right', fontSize: 12, opacity: .65 }}>
                {game.created_at?.slice(0, 10) ?? ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * StatusBar - Displays current game status and winner
 */
function StatusBar({ status, winner, currentPlayer }) {
  // PUBLIC_INTERFACE
  /**
   * Renders status info. If finished, displays winner/ tie.
   */
  let message = "";
  if (!status) return null;
  if (status === "in_progress") {
    message = `Current turn: ${currentPlayer === "X" ? "X" : "O"}`;
  } else if (status === "finished") {
    message =
      winner === "tie"
        ? "It's a tie! 🤝"
        : winner
        ? `Winner: ${winner} 🎉`
        : "Game Over";
  } else {
    message = status.replace("_", " ");
  }
  return (
    <div
      className="ttt-status-bar"
      style={{
        fontSize: 21,
        fontWeight: 600,
        marginTop: 10,
        marginBottom: 5,
        color:
          status === "finished"
            ? winner && winner !== "tie"
              ? COLORS.accent
              : "#999"
            : COLORS.primary,
        minHeight: 30
      }}
    >
      {message}
    </div>
  );
}

/**
 * StartGameButton - Button for starting new games
 */
function StartGameButton({ onClick, disabled }) {
  // PUBLIC_INTERFACE
  /**
   * Button for starting a new game.
   */
  return (
    <button
      style={{
        padding: "12px 26px",
        border: "none",
        background: COLORS.primary,
        color: COLORS.secondary,
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer",
        marginRight: 12,
        transition: "background 0.2s",
        opacity: disabled ? 0.65 : 1
      }}
      onClick={onClick}
      disabled={disabled}
    >
      Start New Game
    </button>
  );
}

// --- API Helper Functions ---
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000"; // Change port if needed.

async function apiStartGame() {
  // PUBLIC_INTERFACE
  /**
   * Calls backend to start game.
   */
  const resp = await fetch(`${BACKEND_URL}/games`, { method: "POST" });
  if (!resp.ok) throw new Error("Failed to start game");
  return resp.json();
}

async function apiPlayMove(game_id, cell) {
  // PUBLIC_INTERFACE
  /**
   * Calls backend to submit move (cell: 0-8)
   */
  const resp = await fetch(`${BACKEND_URL}/games/${game_id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position: cell })
  });
  if (!resp.ok) throw new Error("Failed to play move");
  return resp.json();
}

async function apiGetStatus(game_id) {
  // PUBLIC_INTERFACE
  /**
   * Gets up-to-date game state.
   */
  const resp = await fetch(`${BACKEND_URL}/games/${game_id}`);
  if (!resp.ok) throw new Error("Failed to fetch status");
  return resp.json();
}

async function apiGetHistory() {
  // PUBLIC_INTERFACE
  /**
   * Gets prior games list.
   */
  const resp = await fetch(`${BACKEND_URL}/games/history`);
  if (!resp.ok) throw new Error("Failed to fetch history");
  return resp.json();
}

// --- Main App Component ---

function App() {
  // Game state and UI
  const [theme, setTheme] = useState("light");
  const [currentGame, setCurrentGame] = useState(null); // {game_id, board, status, winner, current_player, moves:[], ...}
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);

  // --- Color Theme handling (built-in) ---
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // --- Load Recent History on Mount ---
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line
  }, []);

  // --- Fetch game status if a game is selected from sidebar ---
  useEffect(() => {
    if (!selectedGameId) return;
    fetchGameStatus(selectedGameId);
    // eslint-disable-next-line
  }, [selectedGameId]);

  // --- API Fetchers ---

  async function fetchHistory() {
    try {
      const result = await apiGetHistory();
      setHistory(result.games || []);
    } catch (err) {
      setHistory([]);
    }
  }

  async function fetchGameStatus(game_id) {
    setError("");
    setIsLoading(true);
    try {
      const result = await apiGetStatus(game_id);
      setCurrentGame(result);
      setSelectedGameId(game_id);
    } catch {
      setError("Failed to load game status");
      setCurrentGame(null);
    }
    setIsLoading(false);
  }

  // --- Handlers ---

  // PUBLIC_INTERFACE
  async function handleStartGame() {
    setError("");
    setIsLoading(true);
    try {
      const game = await apiStartGame();
      setCurrentGame(game);
      setSelectedGameId(game.game_id);
      await fetchHistory();
    } catch {
      setError("Could not start a new game.");
    }
    setIsLoading(false);
  }

  // PUBLIC_INTERFACE
  async function handleCellClick(idx) {
    if (!currentGame || currentGame.status !== "in_progress") return;
    setIsLoading(true);
    setError("");
    try {
      const updated = await apiPlayMove(currentGame.game_id, idx);
      setCurrentGame(updated);
      if (updated.status === "finished") {
        await fetchHistory();
      }
    } catch {
      setError("Move not allowed or network error.");
    }
    setIsLoading(false);
  }

  // PUBLIC_INTERFACE
  async function handleSelectHistory(game_id) {
    setSelectedGameId(game_id);
  }

  // PUBLIC_INTERFACE
  function handleThemeToggle() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  // Safely derive board for board display
  const board =
    (currentGame && Array.isArray(currentGame.board) && currentGame.board.length === 9)
      ? currentGame.board
      : Array(9).fill("");

  // Lock board if not in_progress or loading or not viewing live game
  const locked =
    isLoading ||
    !currentGame ||
    currentGame.status !== "in_progress" ||
    selectedGameId !== currentGame.game_id;

  // Extract winner and player for UI
  const winner = currentGame?.winner;
  const currentPlayer = currentGame?.current_player;
  const status = currentGame?.status;

  return (
    <div
      className="App"
      style={{ minHeight: "100vh", background: "#fff", color: "#222" }}
    >
      <header
        className="App-header"
        style={{
          display: "flex",
          flexDirection: "row",
          minHeight: "100vh"
        }}
      >
        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center"
          }}
        >
          <main
            className="ttt-main"
            style={{
              maxWidth: 380,
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "#fafbfc",
              boxShadow: "0 2px 9px 0 rgba(60,100,200,0.07)",
              borderRadius: 16,
              padding: "30px 22px 38px 22px",
              minHeight: 480,
              marginTop: 48,
              marginBottom: 48
            }}
          >
            {/* Theme Toggle */}
            <button
              className="theme-toggle"
              type="button"
              onClick={handleThemeToggle}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              style={{
                position: "absolute",
                top: 20,
                right: 24,
                background: COLORS.primary,
                color: COLORS.secondary,
                border: "none",
                borderRadius: 8,
                padding: "7px 16px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
            {/* Title */}
            <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.primary, marginTop: 10 }}>
              Tic Tac Toe
            </div>
            <small style={{ color: "#888", marginBottom: 4, fontWeight: 500, letterSpacing: 0.5 }}>
              Built with React · KAVIA template
            </small>
            {/* StatusBar */}
            <StatusBar status={status} winner={winner} currentPlayer={currentPlayer} />
            {/* Board */}
            <GameBoard board={board} onCellClick={handleCellClick} locked={locked} />
            {/* Error/Notifications */}
            {error && (
              <div style={{ color: "#b71c1c", marginBottom: 8 }}>{error}</div>
            )}
            {/* Action Buttons */}
            <div style={{ marginTop: 8 }}>
              <StartGameButton onClick={handleStartGame} disabled={isLoading} />
              <button
                style={{
                  padding: "12px 26px",
                  border: "none",
                  background: COLORS.accent,
                  color: COLORS.primary,
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  marginLeft: 8
                }}
                onClick={() => {
                  if (selectedGameId) fetchGameStatus(selectedGameId);
                  else fetchHistory();
                }}
                disabled={isLoading || !selectedGameId}
              >
                Refresh
              </button>
            </div>
            {/* Board legend */}
            <div style={{ marginTop: 15, fontSize: 13, color: "#aaa" }}>
              {currentGame
                ? `Game #${String(currentGame.game_id).padStart(5, "0")} · ${status === "in_progress"
                    ? (currentPlayer === "X" ? "X's" : "O's") + " turn"
                    : status === "finished"
                      ? winner === "tie"
                        ? "Tie"
                        : `Winner: ${winner}`
                      : status}`
                : "Start a game to play!"}
            </div>
          </main>
        </div>
        {/* Sidebar */}
        <div style={{
          width: 280, minWidth: 180,
          background: "#f8f9fa", borderLeft: `1px solid #e9ecef`
        }}>
          <GameHistorySidebar
            history={history}
            onSelect={handleSelectHistory}
            selectedGameId={selectedGameId}
          />
        </div>
      </header>
    </div>
  );
}

export default App;
