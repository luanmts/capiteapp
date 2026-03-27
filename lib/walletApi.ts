/**
 * Wallet API — busca saldo real do usuário no backend.
 * Retorna 0 em caso de falha; nunca lança exceção.
 */
export async function fetchBalance(token: string): Promise<number> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return 0;
  try {
    const res = await fetch(`${apiUrl}/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.available_balance === "number" ? data.available_balance : 0;
  } catch {
    return 0;
  }
}
