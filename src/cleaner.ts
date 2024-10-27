class Cleaner {
  baseContent: string;
  currentContent: string;

  constructor(baseContent: string, currentContent: string) {
    this.baseContent = baseContent;
    this.currentContent = currentContent;
  }

  async clean(): Promise<{ content: string; similarity: number }> {
    // Split contents into lines
    const baseLines = this.baseContent.split('\n');
    const currentLines = this.currentContent.split('\n');
    const cleanedLines: string[] = [];

    for (let i = 0; i < currentLines.length; i++) {
      const baseLine = baseLines[i] || '';
      const currentLine = currentLines[i];

      // Experiment with modifications to adjust similarity
      const modifiedLine = await this.cleanLine(currentLine, baseLine);
      cleanedLines.push(modifiedLine);
    }

    const cleanedContent = cleanedLines.join('\n');
    const similarity = this.computeSimilarity(this.baseContent, cleanedContent);

    return { content: cleanedContent, similarity };
  }

  computeSimilarity(content1: string, content2: string): number {
    // find the percentage of the content1 that is in content2
    const tokens1 = this.tokenize(content1);
    const tokens2 = this.tokenize(content2);

    const intersection = tokens1.filter((token) => tokens2.includes(token)).length;
    const union = new Set([...tokens1, ...tokens2]).size;

    // return the percentage of the content1 that is in content2
    return intersection / union;
  }

  tokenize(content: string): string[] {
    // Tokenize the content into words, symbols, spaces, and line breaks
    return content.split(/(\s+|\b)/).filter(token => token.length > 0);
  }

  async cleanLine(currentLine: string, baseLine: string): Promise<string> {
    if (currentLine === baseLine) {
      return currentLine;
    }

    let updatedLine = currentLine;
    let similarity = this.computeSimilarity(baseLine, currentLine);

    const cleaningMethods = [this.replaceQuotes, this.adjustSemicolons, this.adjustWhitespace];

    for (const method of cleaningMethods) {
      const newLine = method(updatedLine, baseLine);
      const newSimilarity = this.computeSimilarity(baseLine, newLine);

      if (newSimilarity > similarity) {
        updatedLine = newLine;
        similarity = newSimilarity;
        // Recursively call cleanLine with the updated line
        return this.cleanLine(updatedLine, baseLine);
      }
    }

    return updatedLine;
  }

  private replaceQuotes(line: string, baseLine: string): string {
    if (line.includes("'") && baseLine.includes('"')) {
      return line.replace(/'/g, '"');
    }
    if (line.includes('"') && baseLine.includes("'")) {
      return line.replace(/"/g, "'");
    }
    return line;
  }

  private adjustSemicolons(line: string, baseLine: string): string {
    if (line.endsWith(';') && !baseLine.endsWith(';')) {
      return line.slice(0, -1);
    }
    if (!line.endsWith(';') && baseLine.endsWith(';')) {
      return line + ';';
    }
    return line;
  }

  private adjustWhitespace(line: string, baseLine: string): string {
    // Trim leading and trailing whitespace
    let trimmedLine = line.trim();

    // Adjust indentation
    const baseIndent = baseLine.match(/^\s*/)?.[0] || '';
    trimmedLine = baseIndent + trimmedLine;

    // Normalize spaces between words/operators
    trimmedLine = trimmedLine.replace(/\s+/g, ' ');

    return trimmedLine;
  }

  async cleanChangedLines(changedLines: {
    [lineNumber: number]: string;
  }): Promise<{ content: string; similarity: number }> {
    const baseLines = this.baseContent.split('\n');
    const currentLines = this.currentContent.split('\n');
    const cleanedLines = [...currentLines];

    for (const [lineNumber, line] of Object.entries(changedLines)) {
      const lineIndex = parseInt(lineNumber);
      const baseLine = baseLines[lineIndex] || '';
      const cleanedLine = await this.cleanLine(line, baseLine);
      cleanedLines[lineIndex] = cleanedLine;
    }

    const cleanedContent = cleanedLines.join('\n');
    const similarity = this.computeSimilarity(this.baseContent, cleanedContent);

    return { content: cleanedContent, similarity };
  }
}

export default Cleaner;
