/**
 * PSADT Documentation Database Initialization
 * 
 * This script creates the SQLite database and tables for storing 
 * PSADT documentation for both v3 and v4 versions.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const config = {
  dbPath: path.join(__dirname, '..', 'data', 'psadt-docs.sqlite'),
  createTablesIfNotExist: true,
  verbose: true
};

// Ensure the data directory exists
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  if (config.verbose) console.log(`Creating data directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to the database
const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  if (config.verbose) console.log(`Connected to database: ${config.dbPath}`);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Tables creation SQL
const createTablesSql = {
  commands: `
    CREATE TABLE IF NOT EXISTS Commands (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        command_name      TEXT NOT NULL,
        version           INTEGER NOT NULL,
        description       TEXT,
        syntax            TEXT,
        return_value      TEXT,
        notes             TEXT,
        aliases           TEXT,
        mapped_command_id INTEGER,
        is_deprecated     BOOLEAN DEFAULT FALSE,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(command_name, version)
    )
  `,
  parameters: `
    CREATE TABLE IF NOT EXISTS Parameters (
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
    )
  `,
  examples: `
    CREATE TABLE IF NOT EXISTS Examples (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        command_id        INTEGER NOT NULL,
        title             TEXT,
        code              TEXT NOT NULL,
        description       TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (command_id) REFERENCES Commands(id) ON DELETE CASCADE
    )
  `,
  documentation_sources: `
    CREATE TABLE IF NOT EXISTS Documentation_Sources (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        version           INTEGER NOT NULL,
        source_url        TEXT NOT NULL,
        file_name         TEXT NOT NULL,
        last_updated      TIMESTAMP,
        last_parsed       TIMESTAMP,
        hash              TEXT,
        status            TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(version, file_name)
    )
  `,
  patterns: `
    CREATE TABLE IF NOT EXISTS Patterns (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        version           INTEGER NOT NULL,
        pattern_type      TEXT NOT NULL,
        regex_pattern     TEXT NOT NULL,
        token_name        TEXT NOT NULL,
        priority          INTEGER DEFAULT 0,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(version, pattern_type, regex_pattern)
    )
  `
};

// Indexes creation SQL
const createIndexesSql = {
  idx_commands_name_version: 'CREATE INDEX IF NOT EXISTS idx_commands_name_version ON Commands(command_name, version)',
  idx_commands_version: 'CREATE INDEX IF NOT EXISTS idx_commands_version ON Commands(version)',
  idx_parameters_command_id: 'CREATE INDEX IF NOT EXISTS idx_parameters_command_id ON Parameters(command_id)',
  idx_parameters_critical: 'CREATE INDEX IF NOT EXISTS idx_parameters_critical ON Parameters(is_critical)',
  idx_examples_command_id: 'CREATE INDEX IF NOT EXISTS idx_examples_command_id ON Examples(command_id)',
  idx_doc_sources_version: 'CREATE INDEX IF NOT EXISTS idx_doc_sources_version ON Documentation_Sources(version)',
  idx_patterns_version_type: 'CREATE INDEX IF NOT EXISTS idx_patterns_version_type ON Patterns(version, pattern_type)'
};

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Begin transaction
      db.run('BEGIN TRANSACTION');

      // Create tables
      Object.entries(createTablesSql).forEach(([tableName, sql]) => {
        db.run(sql, (err) => {
          if (err) {
            console.error(`Error creating table ${tableName}:`, err.message);
            db.run('ROLLBACK');
            reject(err);
          } else if (config.verbose) {
            console.log(`Table created or already exists: ${tableName}`);
          }
        });
      });

      // Create indexes
      Object.entries(createIndexesSql).forEach(([indexName, sql]) => {
        db.run(sql, (err) => {
          if (err) {
            console.error(`Error creating index ${indexName}:`, err.message);
            db.run('ROLLBACK');
            reject(err);
          } else if (config.verbose) {
            console.log(`Index created or already exists: ${indexName}`);
          }
        });
      });

      // Commit transaction
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('Error committing transaction:', err.message);
          db.run('ROLLBACK');
          reject(err);
        } else {
          if (config.verbose) console.log('Database schema created successfully');
          resolve();
        }
      });
    });
  });
};

// Initialize the database
const initDatabase = async () => {
  try {
    if (config.createTablesIfNotExist) {
      await createTables();
    }
    console.log('Database initialization completed successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else if (config.verbose) {
        console.log('Database connection closed');
      }
    });
  }
};

// Run the initialization
initDatabase();
