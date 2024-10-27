import simpleGit from 'simple-git';
import * as vscode from 'vscode';
import {
  getBaseBranch,
  getChangedFiles,
  getCurrentBranch,
  getGitMessage,
  processFile,
} from './git/utils';

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

      // notify user about the changes
      vscode.window.showInformationMessage(getGitMessage(commitResult));
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error: ${err.message}`);
    }
  });

  context.subscriptions.push(disposable);
}

exports.activate = activate;

function deactivate() {}

export { activate, deactivate };
