import Image from "next/image";

const GithubIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.3.1 2 1.3 2 1.3 1.1 2 3 1.4 3.7 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.6-1.4-5.6-6a4.7 4.7 0 0 1 1.3-3.3c-.1-.3-.6-1.6.1-3.3 0 0 1-.3 3.5 1.3a12 12 0 0 1 6.3 0c2.4-1.6 3.5-1.3 3.5-1.3.7 1.7.3 3 .1 3.3a4.7 4.7 0 0 1 1.3 3.3c0 4.6-2.8 5.7-5.6 6 .5.4.8 1.1.8 2.3v3.5c0 .3.2.7.8.6A11.4 11.4 0 0 0 12 .8Z" />
  </svg>
);

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Neurons home">
          <Image
            className="wordmark-logo"
            src="/assets/neurons-logo.svg"
            alt=""
            width={32}
            height={33}
            priority
          />
          <span>Neurons</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#overview">Overview</a>
          <a href="#proof">Proof of Knowledge</a>
          <a href="#tokenomics">Tokenomics</a>
          <a href="#development">Development</a>
        </nav>
        <a
          className="status"
          href="https://github.com/ThinkinCoin/Neurons"
          target="_blank"
          rel="noreferrer"
        >
          <span className="status-dot" />
          Protocol in development
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-network" aria-hidden="true" />
        <div className="hero-copy">
          <div className="hero-brand" aria-hidden="true">

            <span>Axodus knowledge layer / $Neurons</span>
          </div>
          <h1>
            Knowledge becomes
            <br />
            verifiable value.
          </h1>
          <p className="hero-intro">
            A Proof-of-Knowledge token designed to recognize validated learning
            across the Axodus ecosystem.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#tokenomics">
              Explore tokenomics <span aria-hidden="true">→</span>
            </a>
            <a
              className="button button-secondary"
              href="https://github.com/ThinkinCoin/Neurons"
              target="_blank"
              rel="noreferrer"
            >
              View source <Arrow />
            </a>
          </div>
        </div>
        <div className="hero-telemetry" aria-label="Protocol metadata">
          <div>
            <span>Token standard</span>
            <strong>ERC-20</strong>
          </div>
          <div>
            <span>Verification</span>
            <strong>EIP-712</strong>
          </div>
          <div>
            <span>Supply ceiling</span>
            <strong>10,000,000</strong>
          </div>
          <div>
            <span>Current state</span>
            <strong>Development</strong>
          </div>
        </div>
      </section>

      <section className="section intro-section" id="overview">
        <div className="section-index">Overview</div>
        <div className="intro-grid">
          <h2>Not speculation. A signal of demonstrated knowledge.</h2>
          <div className="prose-large">
            <p>
              $Neurons is conceived as the knowledge-recognition layer of
              Axodus: a capped digital asset minted through verified
              achievements rather than passive participation.
            </p>
            <p>
              Its purpose is to connect learning events, cryptographic
              verification and programmable rewards—making knowledge portable
              across an open ecosystem.
            </p>
          </div>
        </div>
        <div className="principles">
          <article>
            
            <h3>Knowledge-first issuance</h3>
            <p>
              Rewards begin with a validated learning event, not a purchase
              flow.
            </p>
          </article>
          <article>
            
            <h3>Verifiable by design</h3>
            <p>
              Structured signatures connect off-chain achievement records to
              controlled on-chain minting.
            </p>
          </article>
          <article>
            
            <h3>Bounded supply</h3>
            <p>
              The ERC-20 contract enforces a maximum supply of 10 million
              $Neurons.
            </p>
          </article>
        </div>
      </section>

      <section className="section proof-section" id="proof">
        <div className="section-index">02 / Proof of Knowledge</div>
        <div className="proof-heading">
          <div>
            <p className="kicker">From learning event to on-chain signal</p>
            <h2>A controlled verification pipeline.</h2>
          </div>
          <p>
            The current protocol architecture separates token logic,
            authorization and mint control. Each layer has a specific role in
            turning eligible knowledge proofs into token rewards.
          </p>
        </div>
        <div className="pipeline">
          <article>
           
            <div className="node-icon">L</div>
            <h3>Learn</h3>
            <p>
              A participant completes an eligible course, challenge or
              knowledge activity within an Axodus experience.
            </p>
          </article>
          <article>
           
            <div className="node-icon">V</div>
            <h3>Verify</h3>
            <p>
              A designated verifier authorizes the achievement using a
              structured EIP-712 signature.
            </p>
          </article>
          <article>
            
            <div className="node-icon">M</div>
            <h3>Mint</h3>
            <p>
              The PoK minter validates limits, timestamp and nonce before
              issuing the approved amount.
            </p>
          </article>
          <article>
            
            <div className="node-icon">N</div>
            <h3>Recognize</h3>
            <p>
              $Neurons becomes a portable, on-chain record of value generated
              through demonstrated knowledge.
            </p>
          </article>
        </div>
      </section>

      <section className="section architecture-section">
        <div className="section-index">Protocol architecture</div>
        <div className="architecture-grid">
          <div className="architecture-title">
            <p className="kicker">Separation of concerns</p>
            <h2>Four modules.<br />One knowledge layer.</h2>
            <p>
              A modular contract system keeps token behavior, authorization,
              mint policy and future interoperability distinct.
            </p>
          </div>
          <div className="module-stack">
            <article>
              <span>CORE /</span>
              <div>
                <h3>Neurons.sol</h3>
                <p>ERC-20 core, capped supply, roles, pause and permit.</p>
              </div>
              <strong>Live code</strong>
            </article>
            <article>
              <span>MINT /</span>
              <div>
                <h3>PoKMinter.sol</h3>
                <p>Signature checks, nonce protection and issuance limits.</p>
              </div>
              <strong>Live code</strong>
            </article>
            <article>
              <span>AUTH /</span>
              <div>
                <h3>ECDSAVerifier.sol</h3>
                <p>EIP-712 structured verification and signer control.</p>
              </div>
              <strong>Live code</strong>
            </article>
            <article>
              <span>BRIDGE /</span>
              <div>
                <h3>NeuronsOFTAdapter.sol</h3>
                <p>Cross-chain adapter concept for future LayerZero support.</p>
              </div>
              <strong className="planned">In development</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="section tokenomics-section" id="tokenomics">
        <div className="section-index">Tokenomics</div>
        <div className="tokenomics-heading">
          <h2>Programmed scarcity.<br />Measured issuance.</h2>
          <p>
            The implemented contract configuration combines a hard supply
            ceiling with per-user and per-transaction mint controls.
          </p>
        </div>
        <div className="metrics">
          <article className="metric-primary">
            <span>Maximum supply</span>
            <strong>10M</strong>
            <p>$Neurons / 18 decimals</p>
          </article>
          <article>
            <span>Maximum single mint</span>
            <strong>100</strong>
            <p>$Neurons per approved transaction</p>
          </article>
          <article>
            <span>Daily user limit</span>
            <strong>1,000</strong>
            <p>$Neurons per user per day</p>
          </article>
          <article>
            <span>Mint cooldown</span>
            <strong>1H</strong>
            <p>Default interval between user mints</p>
          </article>
        </div>
        <div className="tokenomics-note">
          <span>Protocol note</span>
          <p>
            These values describe the current repository implementation. The
            protocol remains in development and should not be interpreted as a
            sale, investment offer or guarantee of future utility.
          </p>
        </div>
      </section>

      <section className="section security-section">
        <div className="section-index">Controls</div>
        <div className="security-grid">
          <div>
            <p className="kicker">Security posture</p>
            <h2>Defense in layers.</h2>
          </div>
          <div className="control-list">
            {[
              ["EIP-712 signatures", "Structured authorization with domain separation."],
              ["Nonce protection", "Replay-resistant processing for proof records."],
              ["Rate limits", "Cooldown, daily and single-mint thresholds."],
              ["Role-based access", "Granular admin, minter and burner permissions."],
              ["Emergency pause", "Protocol-level interruption when intervention is required."],
              ["Reentrancy protection", "Guarded mint execution paths."],
            ].map(([title, text], index) => (
              <article key={title}>
                <span>{"=>>"}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section development-section" id="development">
        <div className="section-index">Open development</div>
        <div className="development-card">
          <div className="development-copy">
            <span className="live-label">
              <i /> Development repository
            </span>
            <h2>Inspect what is being built.</h2>
            <p>
              $Neurons is an active protocol project—not a finished consumer
              product. Contracts, tests and deployment tooling are available
              for technical review in the public repository.
            </p>
            <div className="development-actions">
              <a
                className="button button-primary"
                href="https://github.com/ThinkinCoin/Neurons"
                target="_blank"
                rel="noreferrer"
              >
                <GithubIcon /> Explore repository <Arrow />
              </a>
              <a
                className="button button-secondary"
                href="https://docs.axodus.country/tokenomics/overview"
                target="_blank"
                rel="noreferrer"
              >
                Read tokenomics documentation <Arrow />
              </a>
            </div>
          </div>
          <div className="terminal" aria-label="Repository development status">
            <div className="terminal-bar">
              <span />
              <span />
              <span />
              <em>neurons / protocol</em>
            </div>
            <div className="terminal-body">
              <p><b>›</b> contract Neurons <i>is ERC20Capped</i></p>
              <p className="indent"><span>MAX_SUPPLY</span> = 10_000_000 ether;</p>
              <p><b>›</b> contract PoKMinter</p>
              <p className="indent"><span>verify</span>(proof, signature, nonce);</p>
              <p><b>›</b> status</p>
              <p className="indent success">● protocol source available</p>
              <p className="indent warning">● external audit recommended</p>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <a className="wordmark" href="#top" aria-label="Neurons home">
            <Image
              className="wordmark-logo"
              src="/assets/neurons-logo.svg"
              alt=""
              width={32}
              height={33}
            />
            <span>Neurons</span>
          </a>
          <p>A Proof-of-Knowledge token for the Axodus ecosystem.</p>
          <a
            className="axodus-signature"
            href="https://axodus.country"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit Axodus"
          >
            <span>Part of the Axodus ecosystem</span>
            <Image src="/assets/Axodus_logo.svg" alt="Axodus" width={50} height={39} />
          </a>
        </div>
        <div className="footer-links">
          <a href="https://docs.axodus.country/tokenomics/overview" target="_blank" rel="noreferrer">
            Documentation <Arrow />
          </a>
          <a href="https://github.com/ThinkinCoin/Neurons" target="_blank" rel="noreferrer">
            GitHub <Arrow />
          </a>
          <a href="https://axodus.country" target="_blank" rel="noreferrer">
            Axodus <Arrow />
          </a>
        </div>
        <div className="footer-meta">
          <span>Protocol in development</span>
          <span>© 2026 Axodus</span>
        </div>
      </footer>
    </main>
  );
}
