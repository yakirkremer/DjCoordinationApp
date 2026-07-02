/** Pick the single canonical contract ticket for a client. */
export function pickCanonicalTicketForClient(tickets, clientId) {
  if (!clientId || !Array.isArray(tickets)) return null;

  const matches = tickets.filter((ticket) => ticket.clientId === clientId);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  return [...matches].sort(compareTicketPriority)[0];
}

function compareTicketPriority(a, b) {
  const aSigned = a.status === "signed" ? 1 : 0;
  const bSigned = b.status === "signed" ? 1 : 0;
  if (bSigned !== aSigned) return bSigned - aSigned;

  const aSent = Date.parse(a.sentAt ?? "") || 0;
  const bSent = Date.parse(b.sentAt ?? "") || 0;
  if (bSent !== aSent) return bSent - aSent;

  return String(b.id).localeCompare(String(a.id));
}

function mergeTicketPair(preferred, other) {
  if (!other) return preferred;
  if (!preferred) return other;

  const winner = compareTicketPriority(preferred, other) <= 0 ? preferred : other;
  const loser = winner === preferred ? other : preferred;

  return {
    ...loser,
    ...winner,
    values: {
      ...(loser.values ?? {}),
      ...(winner.values ?? {}),
    },
    signToken: winner.signToken || loser.signToken || null,
  };
}

/** Keep at most one ticket per client (newest / signed wins). */
export function dedupeTicketsByClient(tickets) {
  if (!Array.isArray(tickets)) return [];

  const byClient = new Map();
  for (const ticket of tickets) {
    if (!ticket?.clientId) continue;
    const existing = byClient.get(ticket.clientId);
    byClient.set(ticket.clientId, mergeTicketPair(existing, ticket));
  }

  return Array.from(byClient.values());
}

export function findTicketBySignToken(tickets, signToken) {
  if (!signToken || !Array.isArray(tickets)) return null;
  return tickets.find((ticket) => ticket.signToken === signToken) ?? null;
}

/** Resolve ticket from client login or signing link — same record when possible. */
export function resolveContractTicket(tickets, { clientId, signToken } = {}) {
  if (!Array.isArray(tickets)) return null;

  const byToken = signToken ? findTicketBySignToken(tickets, signToken) : null;
  const byClient = clientId ? pickCanonicalTicketForClient(tickets, clientId) : null;

  if (byToken && byClient) {
    if (byToken.id === byClient.id) return byToken;
    // Prefer the client's canonical ticket but keep the link token if it points at same client.
    if (byToken.clientId === byClient.clientId) {
      return { ...byClient, signToken: byToken.signToken || byClient.signToken };
    }
    return byToken;
  }

  return byToken ?? byClient ?? null;
}
