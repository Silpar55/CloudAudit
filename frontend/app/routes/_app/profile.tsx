import { useParams, Link } from "react-router";

export default function Page() {
  const params = useParams();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Page Name</h1>

      <p>Params:</p>
      <pre>{JSON.stringify(params, null, 2)}</pre>

      <div style={{ marginTop: "1rem" }}>
        <Link to="/">Home</Link>
      </div>
    </div>
  );
}
