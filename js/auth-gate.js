/* =====================================================================
   Manufacturing Operations Dashboard — Passphrase Access Gate
   Lightweight, client-side-only demo access screen. This intentionally
   is NOT secure authentication: the passphrase lives in this file and
   can be read from the page source. Its only purpose is to keep casual
   visitors from landing directly on the live dashboard URL.
   ===================================================================== */

const AuthGate = (function () {
  const PASSPHRASE = "gYWHqLK5yxjyu9";
  const SESSION_KEY = "smod_access_granted";

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function grantAccess() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) { /* ignore */ }
  }

  function logout() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    location.reload();
  }

  function gateMarkup() {
    return `
    <div class="auth-gate">
      <div class="auth-gate-card">
        <img class="auth-gate-logo" src="assets/reply-logo.png" alt="Reply" />
        <h1 class="auth-gate-title">Manufacturing Operations Dashboard</h1>
        <div class="auth-gate-subtitle">Secure Demo Access</div>
        <form id="authGateForm" class="auth-gate-form" autocomplete="off">
          <label class="auth-gate-label" for="authGateInput">Passphrase</label>
          <div class="auth-gate-input-wrap">
            <input type="password" id="authGateInput" class="auth-gate-input" autocomplete="off" spellcheck="false" />
            <button type="button" class="auth-gate-toggle" id="authGateToggle" aria-label="Show passphrase">Show</button>
          </div>
          <div class="auth-gate-error" id="authGateError">Incorrect passphrase. Please try again.</div>
          <button type="submit" class="btn btn-primary auth-gate-submit">Continue</button>
        </form>
      </div>
    </div>`;
  }

  function showGate(onSuccess) {
    const app = document.getElementById("app");
    app.innerHTML = gateMarkup();

    const input = document.getElementById("authGateInput");
    const toggle = document.getElementById("authGateToggle");
    const error = document.getElementById("authGateError");
    const form = document.getElementById("authGateForm");

    toggle.addEventListener("click", function () {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.textContent = showing ? "Show" : "Hide";
      input.focus();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (input.value === PASSPHRASE) {
        error.classList.remove("is-visible");
        grantAccess();
        onSuccess();
      } else {
        error.classList.add("is-visible");
        input.value = "";
        input.focus();
      }
    });

    input.focus();
  }

  return { isAuthenticated, grantAccess, logout, showGate };
})();
