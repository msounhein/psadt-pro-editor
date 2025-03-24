/**
 * PSADT Documentation Database Manager
 * 
 * This module provides a set of functions for interacting with the PSADT
 * documentation database, including initialization, command management,
 * parameter management, and version mapping.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class PsadtDb {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '../data/psadt-docs.sqlite');
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the database
   * @param {boolean} reset - If true, drop and recreate all tables
   * @returns {Promise} Resolves when initialization is complete
   */
  async initialize(reset = false) {
    // Ensure the directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // If reset is true and the database exists, delete it
    if (reset && fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }

    // Create or open the database
    this.db = new sqlite3.Database(this.dbPath);

    // Convert db.run to promise-based
    this.db.runAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve(this); // 'this' contains lastID and changes
        });
      });
    };

    // Convert db.all to promise-based
    this.db.allAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    // Convert db.get to promise-based
    this.db.getAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };

    // Load schema from SQL file
    const schemaPath = path.join(__dirname, 'psadt-db-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Run each statement in the schema
    const statements = schemaSql
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement.trim() + ';');

    for (const statement of statements) {
      try {
        await this.db.runAsync(statement);
      } catch (err) {
        console.error(`Error executing statement: ${statement}`);
        console.error(err);
        throw err;
      }
    }

    this.initialized = true;
    return this;
  }

  /**
   * Close the database connection
   * @returns {Promise} Resolves when the connection is closed
   */
  async close() {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) reject(err);
        else {
          this.db = null;
          this.initialized = false;
          resolve();
        }
      });
    });
  }

  /**
   * Add or update a command in the database
   * @param {Object} command - Command object
   * @returns {Promise<number>} The ID of the inserted or updated command
   */
  async upsertCommand(command) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    const {
      command_name,
      version,
      syntax,
      description,
      examples,
      category
    } = command;

    // Check if command already exists
    const existingCommand = await this.db.getAsync(
      'SELECT id FROM commands WHERE command_name = ? AND version = ?',
      [command_name, version]
    );

    if (existingCommand) {
      // Update existing command
      await this.db.runAsync(
        `UPDATE commands SET 
          syntax = ?, 
          description = ?, 
          examples = ?, 
          category = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [syntax, description, examples, category, existingCommand.id]
      );
      return existingCommand.id;
    } else {
      // Insert new command
      const result = await this.db.runAsync(
        `INSERT INTO commands (command_name, version, syntax, description, examples, category)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [command_name, version, syntax, description, examples, category]
      );
      return result.lastID;
    }
  }

  /**
   * Add or update a parameter in the database
   * @param {Object} parameter - Parameter object
   * @returns {Promise<number>} The ID of the inserted or updated parameter
   */
  async upsertParameter(parameter) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    const {
      command_id,
      param_name,
      param_type,
      description,
      is_required,
      is_critical,
      default_value,
      position,
      validation_pattern,
      options
    } = parameter;

    // Check if parameter already exists
    const existingParam = await this.db.getAsync(
      'SELECT id FROM parameters WHERE command_id = ? AND param_name = ?',
      [command_id, param_name]
    );

    if (existingParam) {
      // Update existing parameter
      await this.db.runAsync(
        `UPDATE parameters SET 
          param_type = ?, 
          description = ?, 
          is_required = ?, 
          is_critical = ?,
          default_value = ?,
          position = ?,
          validation_pattern = ?,
          options = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          param_type, 
          description, 
          is_required ? 1 : 0, 
          is_critical ? 1 : 0,
          default_value,
          position,
          validation_pattern,
          options,
          existingParam.id
        ]
      );
      return existingParam.id;
    } else {
      // Insert new parameter
      const result = await this.db.runAsync(
        `INSERT INTO parameters (
          command_id, param_name, param_type, description, 
          is_required, is_critical, default_value, position,
          validation_pattern, options
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          command_id, 
          param_name, 
          param_type, 
          description, 
          is_required ? 1 : 0, 
          is_critical ? 1 : 0,
          default_value,
          position,
          validation_pattern,
          options
        ]
      );
      return result.lastID;
    }
  }

  /**
   * Update command version mappings
   * @param {number} v3CommandId - ID of the v3 command
   * @param {number} v4CommandId - ID of the v4 command
   * @returns {Promise} Resolves when the update is complete
   */
  async updateCommandMappings(v3CommandId, v4CommandId) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    // Set v4 equivalent for v3 command
    await this.db.runAsync(
      'UPDATE commands SET v4_equivalent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [v4CommandId, v3CommandId]
    );
    
    // Set v3 equivalent for v4 command
    await this.db.runAsync(
      'UPDATE commands SET v3_equivalent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [v3CommandId, v4CommandId]
    );
  }

  /**
   * Update parameter version mappings
   * @param {number} v3ParamId - ID of the v3 parameter
   * @param {number} v4ParamId - ID of the v4 parameter
   * @returns {Promise} Resolves when the update is complete
   */
  async updateParameterMappings(v3ParamId, v4ParamId) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    // Set v4 equivalent for v3 parameter
    await this.db.runAsync(
      'UPDATE parameters SET v4_equivalent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [v4ParamId, v3ParamId]
    );
    
    // Set v3 equivalent for v4 parameter
    await this.db.runAsync(
      'UPDATE parameters SET v3_equivalent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [v3ParamId, v4ParamId]
    );
  }

  /**
   * Add a documentation source
   * @param {Object} source - Source object
   * @returns {Promise<number>} The ID of the inserted source
   */
  async addDocumentationSource(source) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    const {
      source_type,
      source_url,
      version,
      hash
    } = source;

    const result = await this.db.runAsync(
      `INSERT INTO documentation_sources (
        source_type, source_url, version, hash, last_updated
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [source_type, source_url, version, hash]
    );
    
    return result.lastID;
  }

  /**
   * Update a documentation source
   * @param {number} sourceId - Source ID
   * @param {string} hash - New content hash
   * @returns {Promise} Resolves when the update is complete
   */
  async updateDocumentationSource(sourceId, hash) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `UPDATE documentation_sources SET 
        hash = ?, 
        last_updated = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [hash, sourceId]
    );
  }

  /**
   * Add a sync log entry
   * @param {Object} log - Log object
   * @returns {Promise<number>} The ID of the inserted log
   */
  async addSyncLog(log) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    const {
      source_id,
      status,
      commands_added,
      commands_updated,
      commands_removed,
      parameters_added,
      parameters_updated,
      parameters_removed,
      error_message
    } = log;

    const result = await this.db.runAsync(
      `INSERT INTO sync_logs (
        source_id, status, commands_added, commands_updated, commands_removed,
        parameters_added, parameters_updated, parameters_removed, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        source_id, 
        status, 
        commands_added || 0, 
        commands_updated || 0, 
        commands_removed || 0,
        parameters_added || 0, 
        parameters_updated || 0, 
        parameters_removed || 0,
        error_message
      ]
    );
    
    return result.lastID;
  }

  /**
   * Get a command by name and version
   * @param {string} commandName - Command name
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Promise<Object>} The command object
   */
  async getCommand(commandName, version) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    return this.db.getAsync(
      'SELECT * FROM commands WHERE command_name = ? AND version = ?',
      [commandName, version]
    );
  }

  /**
   * Get all commands for a specific version
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Promise<Array>} Array of command objects
   */
  async getCommandsByVersion(version) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    return this.db.allAsync(
      'SELECT * FROM commands WHERE version = ? ORDER BY command_name',
      [version]
    );
  }

  /**
   * Get parameters for a specific command
   * @param {number} commandId - Command ID
   * @returns {Promise<Array>} Array of parameter objects
   */
  async getParameters(commandId) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    return this.db.allAsync(
      'SELECT * FROM parameters WHERE command_id = ? ORDER BY position',
      [commandId]
    );
  }

  /**
   * Get all critical parameters
   * @returns {Promise<Array>} Array of critical parameter objects
   */
  async getCriticalParameters() {
    if (!this.initialized) throw new Error('Database not initialized');
    
    return this.db.allAsync(
      'SELECT * FROM critical_parameters ORDER BY command_name, param_name'
    );
  }

  /**
   * Get command mapping information
   * @param {string} commandName - Command name
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Promise<Object>} The equivalent command in the other version
   */
  async getCommandMapping(commandName, version) {
    if (!this.initialized) throw new Error('Database not initialized');
    
    if (version === 3) {
      return this.db.getAsync(
        'SELECT * FROM v3_command_mappings WHERE v3_command = ?',
        [commandName]
      );
    } else {
      return this.db.getAsync(
        'SELECT * FROM v4_command_mappings WHERE v4_command = ?',
        [commandName]
      );
    }
  }

  /**
   * Export data for Monaco Editor use
   * @returns {Promise<Object>} Object with commands, parameters, and mappings
   */
  async exportForEditor() {
    if (!this.initialized) throw new Error('Database not initialized');
    
    // Get all commands
    const commands = await this.db.allAsync(
      'SELECT id, command_name, version, syntax, description, category FROM commands'
    );
    
    // Get all parameters
    const parameters = await this.db.allAsync(
      'SELECT id, command_id, param_name, param_type, description, is_required, is_critical, default_value FROM parameters'
    );
    
    // Get v3 to v4 mappings
    const v3tov4Mappings = await this.db.allAsync(
      'SELECT * FROM v3_command_mappings'
    );
    
    // Get critical parameters (for highlighting)
    const criticalParams = await this.db.allAsync(
      'SELECT param_name, command_name, version FROM critical_parameters'
    );
    
    return {
      commands,
      parameters,
      v3tov4Mappings,
      criticalParams
    };
  }
}

module.exports = PsadtDb;
