export async function register() {
  if ((process.env.PLAID_ENV || "sandbox").toLowerCase() === "production") {
    throw new Error("Debt Crusher refuses Plaid production at startup pending a separate security approval and code change.");
  }
}
