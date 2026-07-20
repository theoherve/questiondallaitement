import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Seeds the shared E2E fixtures before the browser suite runs.
 *
 * N1 deletes these fixtures when it finishes, so running `test:e2e:n1` and then
 * `test:e2e:n2` would otherwise leave N2 driving a wizard with no service to
 * pick — a timeout that looks like a UI bug but is really an empty database.
 */
export default function globalSetup() {
  execFileSync(
    process.execPath,
    [resolve(__dirname, "../scripts/e2e/seed-test-data.mjs")],
    // Sortie capturee plutot qu'heritee : le seed est bavard et brouille les
    // reporters qui parsent stdout.
    { stdio: "pipe" },
  );
}
