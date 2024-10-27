import simpleGit from 'simple-git';
import * as vscode from 'vscode';
import { getCurrentBranch, getBaseBranch, getChangedFiles, processFile } from './git/utils';

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
