-- PSADT Documentation Database Schema
-- 
-- This schema defines the structure for storing PSADT command documentation
-- for both v3 and v4 versions, with mappings between equivalent commands.

-- -------------------------------------------------
-- Commands Table
-- -------------------------------------------------
CREATE TABLE commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_name TEXT NOT NULL,           -- Name of the command (e.g., Set-RegistryKey or Set-ADTRegistryKey)
    version INTEGER NOT NULL,             -- 3 or 4 to indicate PSADT version
    syntax TEXT,                          -- Command syntax with parameters
    description TEXT,                     -- Detailed description
    examples TEXT,                        -- JSON array of usage examples
    category TEXT,                        -- Functional category (e.g., Registry, Process, File)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Mapping fields
    v3_equivalent_id INTEGER,             -- For v4 commands, reference to equivalent v3 command
    v4_equivalent_id INTEGER,             -- For v3 commands, reference to equivalent v4 command
    
    -- Constrains
    UNIQUE(command_name, version)
);

-- -------------------------------------------------
-- Parameters Table
-- -------------------------------------------------
CREATE TABLE parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL,          -- Foreign key to commands
    param_name TEXT NOT NULL,             -- Parameter name without dash (e.g., ContinueOnError)
    param_type TEXT,                      -- Parameter data type (e.g., String, Boolean, Int32)
    description TEXT,                     -- Parameter description
    is_required BOOLEAN DEFAULT 0,        -- Whether parameter is required
    is_critical BOOLEAN DEFAULT 0,        -- Whether parameter is a critical PSADT parameter
    default_value TEXT,                   -- Default value if any
    position INTEGER,                     -- Position in parameter list (1-based)
    validation_pattern TEXT,              -- RegEx or other validation pattern
    options TEXT,                         -- For enum parameters, JSON array of valid options
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Mapping fields
    v3_equivalent_id INTEGER,             -- For v4 parameters, reference to equivalent v3 parameter
    v4_equivalent_id INTEGER,             -- For v3 parameters, reference to equivalent v4 parameter
    
    -- Constraints
    FOREIGN KEY (command_id) REFERENCES commands(id) ON DELETE CASCADE,
    UNIQUE(command_id, param_name)
);

-- -------------------------------------------------
-- Documentation Sources Table
-- -------------------------------------------------
CREATE TABLE documentation_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,            -- 'github', 'local', etc.
    source_url TEXT,                      -- URL or path to source
    version INTEGER NOT NULL,             -- 3 or 4 to indicate PSADT version
    last_updated TIMESTAMP,               -- When source was last updated
    hash TEXT,                            -- Hash of source content for change detection
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------
-- Documentation Sync Log Table
-- -------------------------------------------------
CREATE TABLE sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,           -- Foreign key to documentation_sources
    sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL,                 -- 'success', 'error', etc.
    commands_added INTEGER DEFAULT 0,     -- Number of commands added
    commands_updated INTEGER DEFAULT 0,   -- Number of commands updated
    commands_removed INTEGER DEFAULT 0,   -- Number of commands removed
    parameters_added INTEGER DEFAULT 0,   -- Number of parameters added
    parameters_updated INTEGER DEFAULT 0, -- Number of parameters updated
    parameters_removed INTEGER DEFAULT 0, -- Number of parameters removed
    error_message TEXT,                   -- Error message if status is 'error'
    
    -- Constraints
    FOREIGN KEY (source_id) REFERENCES documentation_sources(id)
);

-- -------------------------------------------------
-- Indices for improved query performance
-- -------------------------------------------------
CREATE INDEX idx_commands_name ON commands(command_name);
CREATE INDEX idx_commands_version ON commands(version);
CREATE INDEX idx_parameters_command_id ON parameters(command_id);
CREATE INDEX idx_parameters_name ON parameters(param_name);
CREATE INDEX idx_parameters_is_critical ON parameters(is_critical);

-- -------------------------------------------------
-- Views for simplified querying
-- -------------------------------------------------

-- View for v3 commands with their v4 equivalents
CREATE VIEW v3_command_mappings AS
SELECT 
    v3.id AS v3_id,
    v3.command_name AS v3_command,
    v4.id AS v4_id,
    v4.command_name AS v4_command
FROM 
    commands v3
LEFT JOIN 
    commands v4 ON v3.v4_equivalent_id = v4.id
WHERE 
    v3.version = 3;

-- View for v4 commands with their v3 equivalents
CREATE VIEW v4_command_mappings AS
SELECT 
    v4.id AS v4_id,
    v4.command_name AS v4_command,
    v3.id AS v3_id,
    v3.command_name AS v3_command
FROM 
    commands v4
LEFT JOIN 
    commands v3 ON v4.v3_equivalent_id = v3.id
WHERE 
    v4.version = 4;

-- View for critical parameters
CREATE VIEW critical_parameters AS
SELECT 
    p.id,
    c.command_name,
    c.version,
    p.param_name,
    p.param_type,
    p.description
FROM 
    parameters p
JOIN 
    commands c ON p.command_id = c.id
WHERE 
    p.is_critical = 1;
