/**
 * Unit tests for the pure validation/normalization functions in script.js.
 *
 * Run with:  npx vitest run
 */

const { normalizeLead, validateField, validateForm } = require("../script.js");

/* ── normalizeLead ────────────────────────────────────────────────────── */

describe("normalizeLead", () => {
  test("trims all string values", () => {
    const result = normalizeLead({
      first_name: "  Alice  ",
      last_name: "  Smith ",
      email: " Alice@Example.COM ",
      phone: " 1234567890 ",
      company: " Acme ",
      message: "  Hello  ",
    });
    expect(result.first_name).toBe("Alice");
    expect(result.last_name).toBe("Smith");
    expect(result.phone).toBe("1234567890");
    expect(result.company).toBe("Acme");
    expect(result.message).toBe("Hello");
  });

  test("lowercases the email", () => {
    const result = normalizeLead({ email: "  Alice@Example.COM  " });
    expect(result.email).toBe("alice@example.com");
  });
});

/* ── validateField ────────────────────────────────────────────────────── */

describe("validateField", () => {
  test("first_name required", () => {
    expect(validateField("first_name", "")).toBe("First name is required.");
    expect(validateField("first_name", "Ada")).toBe("");
  });

  test("last_name required", () => {
    expect(validateField("last_name", "")).toBe("Last name is required.");
    expect(validateField("last_name", "Lovelace")).toBe("");
  });

  test("email required", () => {
    expect(validateField("email", "")).toBe("Email is required.");
  });

  test("email invalid format", () => {
    expect(validateField("email", "john@")).toBe("Please enter a valid email address.");
    expect(validateField("email", "noatsign.com")).toBe("Please enter a valid email address.");
  });

  test("email valid", () => {
    expect(validateField("email", "ada@example.com")).toBe("");
  });

  test("phone required", () => {
    expect(validateField("phone", "")).toBe("Phone number is required.");
  });

  test("phone invalid characters", () => {
    expect(validateField("phone", "abc1234567890")).toBe(
      "Phone number contains invalid characters."
    );
  });

  test("phone too few digits", () => {
    expect(validateField("phone", "123-456")).toBe(
      "Phone number must contain 10 to 15 digits."
    );
  });

  test("phone valid", () => {
    expect(validateField("phone", "+1 (555) 123-4567")).toBe("");
    expect(validateField("phone", "1234567890")).toBe("");
  });

  test("company required", () => {
    expect(validateField("company", "")).toBe("Company is required.");
    expect(validateField("company", "Acme")).toBe("");
  });

  test("message optional but capped at 1000 chars", () => {
    expect(validateField("message", "")).toBe("");
    expect(validateField("message", "Hello")).toBe("");
    expect(validateField("message", "x".repeat(1001))).toBe(
      "Message must be 1000 characters or fewer."
    );
  });
});

/* ── validateForm ─────────────────────────────────────────────────────── */

describe("validateForm", () => {
  const validData = {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    phone: "+1 555 123 4567",
    company: "Babbage Inc",
    message: "",
  };

  test("returns empty object for valid input", () => {
    expect(validateForm(validData)).toEqual({});
  });

  test("returns errors for invalid email", () => {
    const errors = validateForm({ ...validData, email: "bad@" });
    expect(errors).toHaveProperty("email");
    expect(Object.keys(errors)).toHaveLength(1);
  });

  test("returns errors for missing required fields", () => {
    const errors = validateForm({ ...validData, first_name: "", company: "" });
    expect(errors).toHaveProperty("first_name");
    expect(errors).toHaveProperty("company");
  });

  test("returns error for invalid phone", () => {
    const errors = validateForm({ ...validData, phone: "123" });
    expect(errors).toHaveProperty("phone");
  });
});
