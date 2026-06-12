import { useSearchParams } from 'react-router-dom';
import { googleLoginUrl } from '../api.js';

export default function Login() {
  const [params] = useSearchParams();
  const error = params.get('error');

  return (
    <div className="center">
      <div className="card login-card">
        <h1>⚽ MS 2026 Tipovačka</h1>
        <p className="muted">Tipuj zápasy, zbieraj body, vyhraj s kamošmi.</p>
        {error === 'blocked' && (
          <p className="error">Tvoj účet bol zablokovaný administrátorom.</p>
        )}
        {error === 'auth' && (
          <p className="error">Prihlásenie zlyhalo. Skús to znova.</p>
        )}
        <a className="btn-google" href={googleLoginUrl}>
          <span className="g">G</span> Prihlásiť sa cez Google
        </a>
      </div>
    </div>
  );
}
