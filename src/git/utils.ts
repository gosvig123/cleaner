import vscode from 'vscode';
import Cleaner from '../cleaner';

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

// Updated processFile function
async function processFile(git: any, workspacePath: string, baseBranch: string, file: string) {
  const filePath = vscode.Uri.joinPath(vscode.Uri.file(workspacePath), file);
  try {
    // Get the original content of the file from the base branch
    const baseContent = await git.show([`${baseBranch}:${file}`]);

    // Get the current content of the file
    let currentContent: string;
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      currentContent = document.getText();
    } catch (error) {
      // If the document can't be opened, read the file content directly
      currentContent = await vscode.workspace.fs
        .readFile(filePath)
        .then((buffer) => buffer.toString());
    }

    // Create cleaner instance and clean the content
    const cleaner = new Cleaner(baseContent, currentContent);
    const { content: cleanedContent, similarity } = await cleaner.clean();

    if (cleanedContent !== currentContent) {
      // Apply the cleaned content by writing directly to the file
      await vscode.workspace.fs.writeFile(filePath, Buffer.from(cleanedContent));
    }

    vscode.window.showInformationMessage(`Similarity index for ${file}: ${similarity.toFixed(4)}`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Error processing file ${file}: ${err.message}`);
  }
}


function getGitMessage(commitResult: any): string {
  const { changes, insertions, deletions } = commitResult.summary;
  if (changes === 0 && insertions === 0 && deletions === 0) {
    return 'No changes were made during code cleanup.';
  }
  return `Code cleaned. Changes committed: ${changes} file(s) changed, ${insertions} insertion(s), ${deletions} deletion(s).`;
}
export { getBaseBranch, getChangedFiles, getCurrentBranch, processFile, getGitMessage };
