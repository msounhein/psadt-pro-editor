# PSADT Documentation Database Schema

## Overview
This document defines the database schema for storing PSADT documentation for both v3 and v4. The schema is designed to optimize queries for Monaco editor integration while supporting version-specific features.

## Tables

### Commands
Stores all PSADT commands from both v3 and v4.

```sql
CREATE TABLE Commands (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    command_name      TEXT NOT NULL,
    version           INTEGER NOT NULL, -- 3 or 4
    description       TEXT,
    syntax            TEXT,
    return_value      TEXT,
    notes             TEXT,
    aliases           TEXT,
    mapped_command_id INTEGER, -- Foreign key to the equivalent command in the other version
    is_deprecated     BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(command_name, version)
);

-- Index for quick lookups by command name and version
CREATE INDEX idx_commands_name_version ON Commands(command_name, version);

-- Index for version filtering
CREATE INDEX idx_commands_version ON Commands(version);
```

### Parameters
Stores all parameters for each command.

```sql
CREATE TABLE Parameters (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id        INTEGER NOT NULL,
    param_name        TEXT NOT NULL,
    param_type        TEXT,
    description       TEXT,
    is_required       BOOLEAN DEFAULT FALSE,
    is_critical       BOOLEAN DEFAULT FALSE,
    default_value     TEXT,
    validation_pattern TEXT,
    position          INTEGER,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (command_id) REFERENCES Commands(id) ON DELETE CASCADE,
    UNIQUE(command_id, param_name)
);

-- Index for quick parameter lookups
CREATE INDEX idx_parameters_command_id ON Parameters(command_id);

-- Index for finding critical parameters
CREATE INDEX idx_parameters_critical ON Parameters(is_critical);
```

### Examples
Stores example usage for each command.

```sql
CREATE TABLE Examples (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id        INTEGER NOT NULL,
    title             TEXT,
    code              TEXT NOT NULL,
    description       TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (command_id) REFERENCES Commands(id) ON DELETE CASCADE
);

-- Index for quick example lookups
CREATE INDEX idx_examples_command_id ON Examples(command_id);
```

### Documentation_Sources
Tracks documentation source files and their last updated timestamps.

```sql
CREATE TABLE Documentation_Sources (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    version           INTEGER NOT NULL, -- 3 or 4
    source_url        TEXT NOT NULL,
    file_name         TEXT NOT NULL,
    last_updated      TIMESTAMP,
    last_parsed       TIMESTAMP,
    hash              TEXT, -- To detect changes
    status            TEXT, -- 'success', 'error', etc.
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(version, file_name)
);

-- Index for lookup by version
CREATE INDEX idx_doc_sources_version ON Documentation_Sources(version);
```

### Patterns
Stores regex patterns for syntax highlighting.

```sql
CREATE TABLE Patterns (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    version           INTEGER NOT NULL, -- 3 or 4
    pattern_type      TEXT NOT NULL, -- 'command', 'parameter', 'critical_parameter', etc.
    regex_pattern     TEXT NOT NULL,
    token_name        TEXT NOT NULL, -- The token name for Monaco editor
    priority          INTEGER DEFAULT 0, -- Higher numbers get evaluated first
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(version, pattern_type, regex_pattern)
);

-- Index for pattern lookup by version and type
CREATE INDEX idx_patterns_version_type ON Patterns(version, pattern_type);
```

## Relationships

- A **Command** can have multiple **Parameters**
- A **Command** can have multiple **Examples**
- A **Command** can map to another **Command** in a different version
- **Documentation_Sources** track where **Commands** were parsed from
- **Patterns** define how **Commands** and **Parameters** are highlighted

## Query Examples

### Get Command with Parameters and Examples (for Monaco hover)
```sql
SELECT 
    c.command_name, c.description, c.syntax, c.version,
    p.param_name, p.param_type, p.description as param_description, p.is_required, p.is_critical, p.default_value,
    e.code as example_code, e.description as example_description
FROM Commands c
LEFT JOIN Parameters p ON c.id = p.command_id
LEFT JOIN Examples e ON c.id = e.command_id
WHERE c.command_name = ? AND c.version = ?
```

### Get Autocomplete Suggestions
```sql
SELECT 
    c.command_name, c.description, mc.command_name as mapped_command_name
FROM Commands c
LEFT JOIN Commands mc ON c.mapped_command_id = mc.id
WHERE c.command_name LIKE ? AND c.version = ?
ORDER BY c.command_name
LIMIT 10
```

### Get All Critical Parameters for Highlighting
```sql
SELECT 
    p.param_name
FROM Parameters p
JOIN Commands c ON p.command_id = c.id
WHERE p.is_critical = TRUE AND c.version = ?
```

## Notes
- The database is designed to be used with SQLite for development and can be migrated to PostgreSQL for production.
- Timestamp fields facilitate tracking when documentation was last updated.
- Hash values help identify when documentation has changed to minimize unnecessary updates.
- Mapping between v3 and v4 commands enables version-specific features while maintaining compatibility.
