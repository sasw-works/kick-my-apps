// Figma "Customers" 4155:171 — headline + 6 logos, 100px above/below (total 353px).
const LOGOS = [
  { name: "Autodesk", src: "/dark/customers/autodesk.svg" },
  { name: "Deloitte", src: "/dark/customers/deloitte.svg" },
  { name: "Meta", src: "/dark/customers/meta.svg" },
  { name: "Amazon", src: "/dark/customers/amazon.svg" },
  { name: "Google", src: "/dark/customers/google.svg" },
  { name: "Siemens", src: "/dark/customers/siemens.svg" },
];

export default function CustomersSection() {
  return (
    <section className="kma-customers" aria-label="Customers">
      <style>{`
        .kma-customers {
          width: 100%;
          max-width: 1170px;
          margin: 0 auto;
          padding: 100px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 46px;
        }
        /* 4155:173 — Inter 18/32, -0.2px, #a1a1aa */
        .kma-customers-headline {
          margin: 0;
          font-family: var(--font-inter), sans-serif;
          font-size: var(--fs-18);
          font-weight: 400;
          line-height: 32px;
          letter-spacing: var(--ls-body);
          color: var(--muted);
          text-align: center;
          white-space: nowrap;
        }
        /* 4155:174 — 1170 wide, 6 x 150x75, justify-between */
        .kma-customers-logos {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .kma-customers-logos img { display: block; flex-shrink: 0; }
        @media (max-width: 1240px) {
          .kma-customers-logos { flex-wrap: wrap; justify-content: center; gap: 24px 32px; }
        }
      `}</style>
      <p className="kma-customers-headline">Trusted by 45M+ users</p>
      <div className="kma-customers-logos">
        {LOGOS.map((l) => (
          <img key={l.name} src={l.src} alt={l.name} width={150} height={75} />
        ))}
      </div>
    </section>
  );
}
