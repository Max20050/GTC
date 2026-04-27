import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Define the target directory: .claude/issues
const projectRoot = process.cwd();
const issuesDir = path.join(projectRoot, '.claude', 'issues');

// Ensure the directory exists
if (!fs.existsSync(issuesDir)) {
  fs.mkdirSync(issuesDir, { recursive: true });
}

console.log(`Downloading issues to: ${issuesDir}`);

try {
  // Check if gh CLI is installed
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (err) {
    console.error('Error: GitHub CLI (gh) is not installed or not available in PATH.');
    console.error('Please install it from https://cli.github.com/ and authenticate using `gh auth login`.');
    process.exit(1);
  }

  // Fetch open issues up to 100
  // Adjust the limit if you have more issues
  console.log('Fetching open issues...');
  const fields = 'number,title,body,state,createdAt,updatedAt,url,author,labels,comments';
  const stdout = execSync(`gh issue list --state open --limit 100 --json ${fields}`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large repos
  });

  const issues = JSON.parse(stdout);
  
  if (issues.length === 0) {
    console.log('No issues found in the repository.');
    process.exit(0);
  }

  console.log(`Found ${issues.length} issues. Saving to files...`);

  // Write each issue to a markdown file
  for (const issue of issues) {
    const fileName = `issue-${issue.number}.md`;
    const filePath = path.join(issuesDir, fileName);

    const labels = issue.labels ? issue.labels.map(l => l.name).join(', ') : 'None';
    
    let content = `# [${issue.state.toUpperCase()}] ${issue.title} (#${issue.number})\n\n`;
    content += `**URL:** ${issue.url}\n`;
    content += `**Author:** ${issue.author?.login || 'Unknown'}\n`;
    content += `**Created At:** ${new Date(issue.createdAt).toLocaleString()}\n`;
    content += `**Updated At:** ${new Date(issue.updatedAt).toLocaleString()}\n`;
    content += `**Labels:** ${labels}\n\n`;
    content += `---\n\n`;
    
    if (issue.body) {
      content += `## Description\n\n${issue.body}\n\n`;
    } else {
      content += `*No description provided.*\n\n`;
    }

    if (issue.comments && issue.comments.length > 0) {
      content += `---\n\n## Comments\n\n`;
      for (const comment of issue.comments) {
        content += `### Comment by ${comment.author?.login || 'Unknown'} on ${new Date(comment.createdAt).toLocaleString()}\n\n`;
        content += `${comment.body}\n\n`;
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Saved: ${fileName}`);
  }

  console.log('\nSuccess! All issues have been downloaded.');
} catch (error) {
  console.error('\nAn error occurred while fetching issues:');
  console.error(error.message);
  process.exit(1);
}
