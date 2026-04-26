# Security Policy

## Supported Versions

Only the `main` branch is supported.

## Reporting a Vulnerability

Please don't open a public issue for security reports. Use GitHub's [private vulnerability reporting](https://github.com/mhamas/knotviz/security/advisories/new) instead.

Knotviz runs entirely in the browser — there is no server and your data never leaves your machine. In practice the most relevant categories are XSS or content injection via crafted import files (JSON, CSV, GraphML, GEXF).
