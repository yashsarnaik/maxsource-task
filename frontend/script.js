/**
 * Lead Capture — client-side logic.
 *
 * Pure functions (normalizeLead, validateField, validateForm) are exported
 * for unit testing via a conditional module.exports guard.
 */

/* ── Constants ────────────────────────────────────────────────────────── */

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_ALLOWED_RE = /^[0-9\s\-\(\)\+]+$/;
const SUBMIT_TIMEOUT_MS = 15000;

/* ── Pure helpers (testable) ──────────────────────────────────────────── */

/**
 * Extract form field values into a plain object.
 * @param {HTMLFormElement} form
 * @returns {{ first_name: string, last_name: string, email: string, phone: string, company: string, message: string }}
 */
function getFormData(form) {
  const data = new FormData(form);
  return {
    first_name: data.get("first_name") || "",
    last_name: data.get("last_name") || "",
    email: data.get("email") || "",
    phone: data.get("phone") || "",
    company: data.get("company") || "",
    message: data.get("message") || "",
  };
}

/**
 * Trim all values and lowercase the email.
 * @param {Object} data - Raw form data object.
 * @returns {Object} Normalized copy.
 */
function normalizeLead(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = typeof value === "string" ? value.trim() : value;
  }
  if (out.email) {
    out.email = out.email.toLowerCase();
  }
  return out;
}

/**
 * Count the digits in a string.
 * @param {string} str
 * @returns {number}
 */
function countDigits(str) {
  return (str.match(/\d/g) || []).length;
}

/**
 * Validate a single field by name.
 * @param {string} name  - Field name (e.g. "email").
 * @param {string} value - Already-trimmed value.
 * @returns {string} Error message, or "" if valid.
 */
function validateField(name, value) {
  switch (name) {
    case "first_name":
      if (!value) return "First name is required.";
      return "";

    case "last_name":
      if (!value) return "Last name is required.";
      return "";

    case "email":
      if (!value) return "Email is required.";
      if (!EMAIL_RE.test(value)) return "Please enter a valid email address.";
      return "";

    case "phone":
      if (!value) return "Phone number is required.";
      if (!PHONE_ALLOWED_RE.test(value))
        return "Phone number contains invalid characters.";
      {
        const digits = countDigits(value);
        if (digits < 10 || digits > 15)
          return "Phone number must contain 10 to 15 digits.";
      }
      return "";

    case "company":
      if (!value) return "Company is required.";
      return "";

    case "message":
      if (value && value.length > 1000)
        return "Message must be 1000 characters or fewer.";
      return "";

    default:
      return "";
  }
}

/**
 * Validate every field in the data object.
 * @param {Object} data - Normalized lead data.
 * @returns {Object} Map of { fieldName: errorMessage } — empty if all valid.
 */
function validateForm(data) {
  const errors = {};
  for (const [name, value] of Object.entries(data)) {
    const err = validateField(name, value);
    if (err) errors[name] = err;
  }
  return errors;
}

/* ── DOM helpers ──────────────────────────────────────────────────────── */

/**
 * Display field-level errors and set aria-invalid.
 * @param {Object} errors - { fieldName: message }
 */
function showFieldErrors(errors) {
  for (const [name, msg] of Object.entries(errors)) {
    const input = document.getElementById(name);
    const errorEl = document.getElementById(`${name}-error`);
    if (input) input.setAttribute("aria-invalid", "true");
    if (errorEl) errorEl.textContent = msg;
  }
}

/**
 * Clear all field errors and aria-invalid attributes.
 */
function clearErrors() {
  const fields = ["first_name", "last_name", "email", "phone", "company", "message"];
  for (const name of fields) {
    const input = document.getElementById(name);
    const errorEl = document.getElementById(`${name}-error`);
    if (input) input.removeAttribute("aria-invalid");
    if (errorEl) errorEl.textContent = "";
  }
}

/**
 * Toggle the submit button between normal and loading state.
 * @param {boolean} isLoading
 */
function setLoading(isLoading) {
  const btn = document.getElementById("submit-btn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Submitting..." : "Submit";
}

/**
 * Show a success or error banner.
 * @param {"success"|"error"} type
 * @param {string} message
 */
function showStatus(type, message) {
  const banner = document.getElementById("status-banner");
  if (!banner) return;
  banner.className = `status-banner ${type}`;
  banner.textContent = message;
}

/**
 * Hide the status banner.
 */
function hideStatus() {
  const banner = document.getElementById("status-banner");
  if (!banner) return;
  banner.className = "status-banner hidden";
  banner.textContent = "";
}

/* ── API call ─────────────────────────────────────────────────────────── */

/**
 * POST lead data to the backend.
 * @param {Object} payload - Normalized lead data.
 * @returns {Promise<{ ok: boolean, status: number, body: Object }>}
 */
async function submitLead(payload) {
  const apiUrl =
    (typeof window !== "undefined" && window.APP_CONFIG && window.APP_CONFIG.API_URL) ||
    "http://localhost:8000";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let body;
    try {
      body = await response.json();
    } catch {
      body = { success: false, message: "Something went wrong. Please try again." };
    }

    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

/* ── Orchestrator ─────────────────────────────────────────────────────── */

let isSubmitting = false;

/**
 * Handle form submission: validate, submit, show result.
 * @param {Event} event
 */
async function handleSubmit(event) {
  event.preventDefault();

  if (isSubmitting) return;

  hideStatus();
  clearErrors();

  const form = document.getElementById("lead-form");
  const raw = getFormData(form);
  const data = normalizeLead(raw);
  const errors = validateForm(data);

  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    // Focus the first invalid field
    const firstInvalid = Object.keys(errors)[0];
    const el = document.getElementById(firstInvalid);
    if (el) el.focus();
    return;
  }

  isSubmitting = true;
  setLoading(true);

  try {
    const result = await submitLead(data);

    if (result.ok && result.body && result.body.success) {
      showStatus("success", "Thank you! Your information has been submitted successfully.");
      form.reset();
    } else {
      const msg =
        result.body && result.body.message
          ? result.body.message
          : "Something went wrong. Please try again.";

      // If backend returns field-level validation, try to map it
      if ((result.status === 400 || result.status === 422) && result.body && result.body.message) {
        showStatus("error", msg);
      } else {
        showStatus("error", msg);
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      showStatus("error", "Request timed out. Please try again.");
    } else {
      showStatus("error", "Something went wrong. Please try again.");
    }
  } finally {
    isSubmitting = false;
    setLoading(false);
  }
}

/* ── Event binding ────────────────────────────────────────────────────── */

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("lead-form");
    if (form) {
      form.addEventListener("submit", handleSubmit);
    }

    // Validate individual fields on blur & clear errors on input
    const fields = ["first_name", "last_name", "email", "phone", "company", "message"];
    for (const name of fields) {
      const input = document.getElementById(name);
      if (!input) continue;

      input.addEventListener("blur", () => {
        const value = input.value.trim();
        const err = validateField(name, name === "email" ? value.toLowerCase() : value);
        const errorEl = document.getElementById(`${name}-error`);
        if (err) {
          input.setAttribute("aria-invalid", "true");
          if (errorEl) errorEl.textContent = err;
        } else {
          input.removeAttribute("aria-invalid");
          if (errorEl) errorEl.textContent = "";
        }
      });

      input.addEventListener("input", () => {
        const value = input.value.trim();
        const err = validateField(name, name === "email" ? value.toLowerCase() : value);
        if (!err) {
          input.removeAttribute("aria-invalid");
          const errorEl = document.getElementById(`${name}-error`);
          if (errorEl) errorEl.textContent = "";
        }
      });
    }
  });
}

/* ── Exports for unit testing ─────────────────────────────────────────── */

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeLead,
    validateField,
    validateForm,
    countDigits,
  };
}
