import React, { useEffect } from 'react';
import './LandingPage.css';

function LandingPage() {
  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  return (
    <div className="landing-container">
      <header className="landing-header">
        <span className="landing-wordmark">
          EVAL<span className="landing-wordmark-accent">BAR</span>
        </span>
        <span className="landing-sub">ChessBase India Broadcast Tool</span>
      </header>
      <main>
        <section className="intro">
          <h1>Broadcast Manager</h1>
          <p>Enhance your chess broadcasts with cutting-edge features.</p>
        </section>

        <section className="products">
          <a href="evalbars" className="product">
            <h2>Evaluation Bars</h2>
            <p>Visualize game dynamics with multiple evaluation bars.</p>
          </a>
          <a href="ccm" className="product">
            <h2>Chat Chess Moves</h2>
            <p>Engage your audience with interactive chess puzzles in the chat.</p>
          </a>
          <a href="messagedisplay" className="product">
            <h2>Display Messages in Broadcast</h2>
            <p>Feature live chat messages directly in your stream.</p>
          </a>
        </section>
      </main>

      <footer>
        <p>© ChessBase India</p>
      </footer>
    </div>
  );
}

export default LandingPage;
