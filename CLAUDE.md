# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 12 document types via AI chat with full user authentication and document persistence.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github MCP tools


## AI design

When writing code to make calls to LLMs, use your "coreweave-inference" skill to use LiteLLM via OpenRouter to the `openai/gpt-oss-120b` model with CoreWeave as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite as a seperate volume and be created from scratch when the Docker container is brought up without volume.  
Use the SEED_USERNAME and SEED_PASSWORD parameters in .env file to create Admin User when the Applicataion is created for first time.  
Provision should be provided allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop & Delete the Image
scripts/stop-windows-wipe-volumne.ps1 # Stop & Delete the Image and Volumne

# Linux
scripts/start-linux.sh # Start
scripts/stop-linux.sh # Stop & Delete the Image
scripts/stop-windows-wipe-volumne.ps1 # Stop & Delete the Image and Volumne

# Windows
scripts/start-windows.ps1 # Start
scripts/stop-windows.ps1 # Stop & Delete the Image
scripts/stop-windows-wipe-volumne.ps1 # Stop & Delete the Image and Volumne
```

Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

