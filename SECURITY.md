# Security policy

## Supported version

Security updates target the latest published version of Status Bar Tasks.

## Report a vulnerability

Do not open a public issue for a vulnerability.

Use the private security-reporting option in the GitHub repository. Include the affected version, impact, reproduction steps, and a minimal example.

Do not include real secrets, task commands, environment values, or private workspace files.

## Security boundary

Status Bar Tasks reads workspace task sources and calls the public VS Code Tasks API.

The extension does not provide telemetry, a service, or a product network client.

Restricted Mode disables the extension. Virtual Workspaces and browser hosts are unsupported.

The settings panel uses local assets, a default-deny CSP, exact message shapes, and current-row task authorization. The only approved external URL is the project repository.

Task-source edits use `WorkspaceEdit`. The extension leaves each changed document open and dirty.
