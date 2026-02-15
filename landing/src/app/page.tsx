export default function Home() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-plant-container">
            <img src="/sprites/seedling.png" alt="" className="hero-plant" />
          </div>
          <h1 className="hero-title">Quit the Rot</h1>
          <p className="hero-subtitle">
            A simple, mindful way to build better digital habits.
            Nurture your focus, watch your progress bloom.
          </p>
          <div className="hero-cta">
            <a href="#features" className="cta-primary">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="features-title">Simple. Focused. Effective.</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3 className="feature-title">Timed Challenges</h3>
            <p className="feature-description">
              Choose your difficulty level and prove your focus with quick challenges.
            </p>
          </div>

          <div className="feature-card">
            <h3 className="feature-title">Watch It Grow</h3>
            <p className="feature-description">
              Every moment of focused time nurtures your digital plant companion.
            </p>
          </div>

          <div className="feature-card">
            <h3 className="feature-title">Build Habits</h3>
            <p className="feature-description">
              Turn screen time into productive time with gentle accountability.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta">
        <h2 className="final-cta-title">Coming Soon</h2>
        <p className="hero-subtitle">
          Mind Bloom is currently in development. Stay tuned.
        </p>
      </section>
    </div>
  );
}
