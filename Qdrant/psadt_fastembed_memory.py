#!/usr/bin/env python3
"""
PSADT Pro UI - FastEmbed Integration Script with In-Memory Qdrant

This script demonstrates how to integrate FastEmbed and BM25 sparse embeddings
with in-memory Qdrant for easy testing.
"""

import os
import sys
from typing import List, Dict, Any

# Import FastEmbed
try:
    from fastembed import TextEmbedding
    from fastembed.sparse import SparseTextEmbedding
except ImportError:
    print("Error: fastembed is not installed. Install with: pip install fastembed")
    sys.exit(1)

# Import Qdrant client
try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except ImportError:
    print("Error: qdrant-client is not installed. Install with: pip install 'qdrant-client[fastembed]'")
    sys.exit(1)

# Constants
PSADT_PRO_UI_PATH = "C:\\Users\\msoun\\OneDrive\\Documents\\Code\\Web\\psadt-pro-ui"
COMMANDS_COLLECTION = "psadt_commands"

def get_psadt_commands_from_db() -> List[Dict[str, Any]]:
    """
    Fetch PSADT commands from the database.
    This is a placeholder with example data.
    """
    print("Fetching PSADT commands from database...")
    
    # Example placeholder data
    commands = [
        {
            "id": 1,
            "name": "Show-InstallationWelcome",
            "synopsis": "Shows a welcome dialog prompting the user with information about the installation and actions to take.",
            "syntax": "Show-InstallationWelcome -CloseApps <String[]> [-CloseAppsCountdown <Int32>] [-NoCloseApps] [-CloseAppsForce] [-PersistPrompt] [-AllowDefer] [-AllowDeferCloseApps] [-DeferTimes <Int32>] [-DeferDays <Int32>] [-DeferDeadline <String>] [-MinimizeWindows <Boolean>] [-CustomText] [-ForceCloseAppsCountdown <Int32>] [-PromptToSave] [-TopMost <Boolean>]"
        },
        {
            "id": 2,
            "name": "Show-InstallationProgress",
            "