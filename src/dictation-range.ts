export interface DictationRange {
	filePath: string;
	from: number;
	to: number;
	text: string;
}

export function verifiedDictationRange(
	content: string,
	range: DictationRange,
): Pick<DictationRange, "from" | "to"> | null {
	return content.slice(range.from, range.to) === range.text
		? { from: range.from, to: range.to }
		: null;
}

export function dictationReplacementText(
	output: string,
	selection: string,
	existingText?: string,
): string {
	const keepLineBreak = existingText !== undefined
		? existingText.endsWith("\n")
		: selection.length === 0 || selection.endsWith("\n");
	return output + (keepLineBreak ? "\n" : "");
}
