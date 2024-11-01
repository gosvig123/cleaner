import { diffLines } from 'diff';

class Cleaner {
  baseContent: string;
  currentContent: string;

  constructor(baseContent: string, currentContent: string) {
    this.baseContent = baseContent;
    this.currentContent = currentContent;
  }

  async clean(): Promise<{ content: string; similarity: number }> {
    const diff = diffLines(this.baseContent, this.currentContent);
    let cleanedContent = '';

    for (const part of diff) {
      if (part.added) {
        // Clean the added content
        const cleanedPart = await this.cleanContent(part.value);
        cleanedContent += cleanedPart;
      } else if (part.removed) {
        // Skip removed content
        continue;
      } else {
        // Keep unchanged content as is
        cleanedContent += part.value;
      }
    }

    const similarity = this.computeSimilarity(this.baseContent, cleanedContent);
    return { content: cleanedContent, similarity };
  }

  private async cleanContent(content: string): Promise<string> {
    let cleanedContent = content;
    let improved = true;
    let currentSimilarity = this.computeSimilarity(this.baseContent, cleanedContent);

    const cleaningMethods = [
      this.normalizeQuotes,
      this.normalizeSemicolons,
      this.normalizeWhitespace,
      this.normalizeIndentation,
      this.normalizeLineEndings,
    ];

    while (improved) {
      improved = false;

      for (const method of cleaningMethods) {
        const newContent = method.call(this, cleanedContent);
        const newSimilarity = this.computeSimilarity(this.baseContent, newContent);

        if (newSimilarity > currentSimilarity) {
          cleanedContent = newContent;
          currentSimilarity = newSimilarity;
          improved = true;
          break;
        }
      }
    }

    return cleanedContent;
  }

  private normalizeQuotes(content: string): string {
    const baseQuoteStyle = this.detectQuoteStyle(this.baseContent);
    return content.replace(/["'`]/g, baseQuoteStyle);
  }

  private detectQuoteStyle(content: string): string {
    const singleQuotes = (content.match(/'/g) || []).length;
    const doubleQuotes = (content.match(/"/g) || []).length;
    return doubleQuotes >= singleQuotes ? '"' : "'";
  }

  private normalizeSemicolons(content: string): string {
    const baseSemicolonStyle = this.baseContent.includes(';');
    if (baseSemicolonStyle) {
      return content.replace(/([^;])\s*(\n|$)/g, '$1;$2');
    } else {
      return content.replace(/;\s*(\n|$)/g, '$1');
    }
  }

  private normalizeWhitespace(content: string): string {
    return content
      .split('\n')
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .join('\n');
  }

  private normalizeIndentation(content: string): string {
    const baseIndentMatch = this.baseContent.match(/^[ \t]+/m);
    const baseIndent = baseIndentMatch ? baseIndentMatch[0] : '  ';
    return content
      .split('\n')
      .map((line) => {
        const indentLevel = ((line.match(/^\s*/) ?? [''])[0].length / 2) | 0;
        return baseIndent.repeat(indentLevel) + line.trim();
      })
      .join('\n');
  }

  private normalizeLineEndings(content: string): string {
    const baseEnding = this.baseContent.includes('\r\n') ? '\r\n' : '\n';
    return content.replace(/\r?\n/g, baseEnding);
  }

  private computeSimilarity(content1: string, content2: string): number {
    const tokens1 = this.tokenize(content1);
    const tokens2 = this.tokenize(content2);

    const intersection = tokens1.filter((token) => tokens2.includes(token));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.length / union.size;
  }

  private tokenize(content: string): string[] {
    return content
      .split(/(\s+|\b|[{}[\]().,;:+\-*/%=<>!&|^~?])/g)
      .filter((token) => token.trim().length > 0);
  }
}

export default Cleaner;
