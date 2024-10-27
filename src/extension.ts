import simpleGit from 'simple-git';
import * as vscode from 'vscode';

async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('cleaner.clean', async () => {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace is open.');
        return;
      }

      const git = simpleGit(workspaceFolders[0].uri.fsPath);

      // Get current branch
      const currentBranch = await getCurrentBranch(git);

      // Determine base branch
      const baseBranch = await getBaseBranch(git);

      if (!baseBranch) {
        vscode.window.showErrorMessage('Neither "main" nor "master" branch exists.');
        return;
      }

      // Get changed files
      const files = await getChangedFiles(git, baseBranch, currentBranch);

      if (files.length === 0) {
        vscode.window.showInformationMessage('No files have been changed compared to base branch.');
        return;
      }

      // Process each file
      for (const file of files) {
        await processFile(git, workspaceFolders[0].uri.fsPath, baseBranch, file);
      }

      // Stage the changes
      await git.add(files);
      const commitResult = await git.commit('Code cleanup');

      if (
        commitResult.summary.changes === 0 &&
        commitResult.summary.insertions === 0 &&
        commitResult.summary.deletions === 0
      ) {
        vscode.window.showInformationMessage('No changes were made during code cleanup.');
      } else {
        vscode.window.showInformationMessage(
          `Code cleaned. Changes committed: ${commitResult.summary.changes} file(s) changed, ${commitResult.summary.insertions} insertion(s), ${commitResult.summary.deletions} deletion(s).`,
        );
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error: ${err.message}`);
    }
  });

  context.subscriptions.push(disposable);
}

exports.activate = activate;

function deactivate() {}

export { activate, deactivate };

async function getCurrentBranch(git: any): Promise<string> {
  const status = await git.status();
  return status.current;
}

async function getBaseBranch(git: any): Promise<string | null> {
  const branches = await git.branch();
  if (branches.all.includes('main')) {
    return 'main';
  } else if (branches.all.includes('master')) {
    return 'master';
  } else {
    return null;
  }
}

async function getChangedFiles(
  git: any,
  baseBranch: string,
  currentBranch: string,
): Promise<string[]> {
  const diffFiles = await git.diff(['--name-only', `${baseBranch}...${currentBranch}`]);
  const files = diffFiles
    .trim()
    .split('\n')
    .filter((file: string) => file);
  return files;
}

async function processFile(git: any, workspacePath: string, baseBranch: string, file: string) {
  const filePath = vscode.Uri.joinPath(vscode.Uri.file(workspacePath), file);
  try {
    // Get the original content of the file from the base branch
    const baseContent = await git.show([`${baseBranch}:${file}`]);

    // Get the current content of the file
    const document = await vscode.workspace.openTextDocument(filePath);
    const currentContent = document.getText();

    // Apply cleaning functions recursively
    const cleaner = new Cleaner(baseContent, currentContent);
    const cleanedContent = await cleaner.clean();

    if (cleanedContent !== currentContent) {
      // Apply the cleaned content
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(currentContent.length),
      );
      edit.replace(filePath, fullRange, cleanedContent);
      await vscode.workspace.applyEdit(edit);
      // Save the document
      await document.save();
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`Error processing file ${file}: ${err.message}`);
  }
}

class Cleaner {
  baseContent: string;
  currentContent: string;

  constructor(baseContent: string, currentContent: string) {
    this.baseContent = baseContent;
    this.currentContent = currentContent;
  }

  async clean(): Promise<string> {
    const baseTokens = this.tokenize(this.baseContent);
    const currentTokens = this.tokenize(this.currentContent);
    return this.applyNonFunctionalAdjustments(baseTokens, currentTokens);
  }

  tokenize(content: string): string[] {
    // Simple tokenization by whitespace and special characters
    return content.split(/(\s+|[{}()[\],;])/);
  }

  applyNonFunctionalAdjustments(baseTokens: string[], currentTokens: string[]): string {
    let result = '';
    let baseIndex = 0;
    let currentIndex = 0;

    while (currentIndex < currentTokens.length) {
      if (baseIndex >= baseTokens.length) {
        // We've reached the end of the base content, append remaining current tokens
        result += currentTokens.slice(currentIndex).join('');
        break;
      }

      if (baseTokens[baseIndex] === currentTokens[currentIndex]) {
        // Tokens match, keep it
        result += currentTokens[currentIndex];
        baseIndex++;
        currentIndex++;
      } else if (this.isNonFunctionalChange(currentTokens[currentIndex])) {
        // Non-functional change in current, check if it brings us closer to base
        if (this.bringsCloserToBase(currentTokens[currentIndex])) {
          result += currentTokens[currentIndex];
        }
        currentIndex++;
      } else {
        // Functional change or non-matching token, keep current
        result += currentTokens[currentIndex];
        currentIndex++;
        // Try to find the next matching token in base
        while (
          baseIndex < baseTokens.length &&
          baseTokens[baseIndex] !== currentTokens[currentIndex]
        ) {
          baseIndex++;
        }
      }
    }

    return result;
  }

  isNonFunctionalChange(value: string): boolean {
    // Combine multiple checks
    return (
      this.isWhitespaceOnly(value) ||
      this.isSemicolonOnly(value) ||
      this.isTrailingCommaDifference(value) ||
      this.isQuoteStyleDifference(value) ||
      this.isBracePositionDifference(value)
    );
  }

  bringsCloserToBase(value: string): boolean {
    // Implement logic to determine if the change brings us closer to the base style
    // This could involve checking whitespace, semicolons, quotes, etc.
    // Return true if the change aligns with the base style, false otherwise
    // Example implementation:
    const baseStyle = this.analyzeStyle(this.baseContent);
    const changeStyle = this.analyzeStyle(value);
    return this.compareStyles(baseStyle, changeStyle);
  }

  analyzeStyle(content: string): any {
    // Implement logic to analyze the coding style of the content
    // This could return an object with various style metrics
    // Example implementation:
    return {
      indentation: this.getIndentationType(content),
      quoteStyle: this.getQuoteStyle(content),
      semicolonUsage: this.getSemicolonUsage(content),
      // Add more style metrics as needed
    };
  }

  compareStyles(baseStyle: any, changeStyle: any): boolean {
    // Compare the change style with the base style
    // Return true if they match or if the change brings us closer to the base style
    // Example implementation:
    return (
      baseStyle.indentation === changeStyle.indentation &&
      baseStyle.quoteStyle === changeStyle.quoteStyle &&
      baseStyle.semicolonUsage === changeStyle.semicolonUsage
      // Add more comparisons as needed
    );
  }

  getIndentationType(content: string): string {
    // Implement logic to determine indentation type (spaces or tabs)
    // Example implementation:
    return content.indexOf('\t') !== -1 ? 'tabs' : 'spaces';
  }

  getQuoteStyle(content: string): string {
    // Implement logic to determine quote style (single or double)
    // Example implementation:
    const singleQuotes = (content.match(/'/g) || []).length;
    const doubleQuotes = (content.match(/"/g) || []).length;
    return singleQuotes > doubleQuotes ? 'single' : 'double';
  }

  getSemicolonUsage(content: string): string {
    // Implement logic to determine semicolon usage
    // Example implementation:
    return content.indexOf(';') !== -1 ? 'with' : 'without';
  }

  isWhitespaceOnly(value: string): boolean {
    return /^\s*$/.test(value);
  }

  isSemicolonOnly(value: string): boolean {
    return /^[;\s]*$/.test(value);
  }

  isTrailingCommaDifference(value: string): boolean {
    // Implement logic to check for trailing comma differences
    // Example implementation:
    return value.endsWith(',');
  }

  isQuoteStyleDifference(value: string): boolean {
    // Implement logic to check for quote style differences
    // Example implementation:
    return (
      (value.includes('"') && value.includes("'")) ||
      (value.includes('"') && !value.includes("'")) ||
      (value.includes("'") && !value.includes('"'))
    );
  }

  isBracePositionDifference(value: string): boolean {
    // Implement logic to check for brace position differences
    // Example implementation:
    return (
      (value.includes('{') && value.includes('}')) ||
      (value.includes('{') && !value.includes('}')) ||
      (value.includes('}') && !value.includes('{'))
    );
  }
}
