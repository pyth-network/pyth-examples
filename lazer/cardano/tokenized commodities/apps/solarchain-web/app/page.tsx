const cards = [
  {
    "title": "Batch intake",
    "body": "Carga de lecturas energéticas y construcción de quote de settlement."
  },
  {
    "title": "Savings",
    "body": "Cálculo de ahorro económico, exportación y reducción de emisiones."
  },
  {
    "title": "Tokenization",
    "body": "Preparación de metadata y liquidación hacia Native Assets / CIP-68."
  }
];

export default function Page() {
  return (
    <main style={{
      fontFamily: "Inter, system-ui, sans-serif",
      margin: "0 auto",
      maxWidth: 1100,
      padding: "32px"
    }}>
      <h1 style={{ fontSize: 36, marginBottom: 12 }}>SolarChain</h1>
      <p style={{ color: "#444", maxWidth: 900 }}>
        Demo web del hackathon. Mantiene el mismo stack base Cardano que el otro producto,
        pero cambia la lógica de dominio. El backend esperado corre en <code>http://localhost:4010</code>.
      </p>

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 16,
        marginTop: 24
      }}>
        {cards.map((card) => (
          <article
            key={card.title}
            style={{
              border: "1px solid #ddd",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.04)"
            }}
          >
            <h2 style={{ fontSize: 20 }}>{card.title}</h2>
            <p style={{ color: "#555" }}>{card.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
