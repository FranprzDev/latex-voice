/**
 * Maps technical errors to short, user-friendly Spanish messages.
 */
export function friendlyError(e: unknown): string {
	const msg = e instanceof Error ? e.message : String(e);
	const lower = msg.toLowerCase();

	if (lower.includes("401") || lower.includes("invalid api key") || lower.includes("unauthorized"))
		return "API key inválida. Revisala en Settings → LaTeX Voice.";
	if (lower.includes("429") || lower.includes("rate limit"))
		return "Límite de la API alcanzado. Esperá un momento.";
	if (lower.includes("402") || lower.includes("insufficient") || lower.includes("billing"))
		return "Sin crédito en la cuenta de la API.";
	if (lower.includes("timeout") || lower.includes("timed out"))
		return "La API tardó demasiado. Intentá de nuevo.";
	if (lower.includes("fetch") || lower.includes("network") || lower.includes("enotfound") || lower.includes("econnrefused"))
		return "Sin conexión. Revisá tu internet.";
	if (lower.includes("notallowed") || lower.includes("permission") || lower.includes("mic"))
		return "Sin permiso de micrófono. Habilitalo en macOS → Ajustes → Privacidad.";
	if (lower.includes("not recording"))
		return "No hay grabación activa.";
	if (lower.includes("no active") || lower.includes("markdown"))
		return "Abrí una nota antes de dictar.";
	if (lower.includes("empty transcript"))
		return "No detecté voz. Revisá que el micrófono funcione y el permiso esté dado.";

	// fallback: first line, trimmed
	return msg.split("\n")[0].slice(0, 120);
}
