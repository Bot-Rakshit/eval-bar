export default function LandingPage() {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <span className="landing-wordmark">
          EVAL<span className="landing-wordmark-accent">BAR</span>
        </span>
        <span className="landing-sub">ChessBase India Broadcast Tool</span>
      </header>
      <main className="landing-main">
        <section className="landing-intro">
          <h1>Broadcast Manager</h1>
          <p>Enhance your chess broadcasts with cutting-edge features.</p>
        </section>

        <section className="landing-products">
          <a href="evalbars" className="landing-product">
            <h2>Evaluation Bars</h2>
            <p>Visualize game dynamics with multiple evaluation bars.</p>
          </a>
          <a href="olympiad/open" className="landing-product">
            <h2>Olympiad · India Open</h2>
            <p>Auto-follows the Indian open team through every round.</p>
          </a>
          <a href="olympiad/women" className="landing-product">
            <h2>Olympiad · India Women</h2>
            <p>Auto-follows the Indian women's team through every round.</p>
          </a>
          <a href="ccm" className="landing-product">
            <h2>Chat Chess Moves</h2>
            <p>Engage your audience with interactive chess puzzles in the chat.</p>
          </a>
          <a href="messagedisplay" className="landing-product">
            <h2>Display Messages in Broadcast</h2>
            <p>Feature live chat messages directly in your stream.</p>
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© ChessBase India</p>
      </footer>
    </div>
  );
}
