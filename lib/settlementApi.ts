/**
 * Settlement API — notifica o backend quando um mercado é resolvido.
 * Nunca lança exceção; erros são silenciosos para não quebrar o fluxo do front.
 */
export async function settleMarket(
  marketId: string,
  outcome: "yes" | "no" | "cancelled",
  token: string
): Promise<boolean> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return false;
  try {
    const res = await fetch(`${apiUrl}/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ marketId, outcome }),
    });
    return res.ok;
  } catch {
    return false;
  }
}