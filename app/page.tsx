export default function Home() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Constraint Atlas";

  return (
    <main>
      <section aria-labelledby="page-title" className="health-card">
        <p className="eyebrow">System status</p>
        <h1 id="page-title">{siteName}</h1>
        <p>把无力感拆成需求、条件、约束与可行动路径的交互式因果地图。</p>
        <p className="status" role="status">
          <span aria-hidden="true" />
          Healthy
        </p>
      </section>
    </main>
  );
}
