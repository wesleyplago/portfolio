import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="section">
      <h1>Página não encontrada</h1>
      <p>
        <Link to="/">Voltar ao início</Link>
      </p>
    </section>
  );
}
