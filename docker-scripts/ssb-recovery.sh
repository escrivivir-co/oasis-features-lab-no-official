#!/bin/bash
# SSB Database Recovery Script
# This script handles SSB database initialization and corruption recovery

set -e

SSB_PATH="/home/oasis/.ssb"
RECOVERY_LOG="/app/logs/ssb-recovery.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$RECOVERY_LOG"
}

# Function to check if a LevelDB directory is corrupted
check_leveldb_corruption() {
    local db_path="$1"
    local db_name="$2"
    
    if [ -d "$db_path" ]; then
        log_message "🔍 Checking LevelDB integrity for $db_name at $db_path"
        
        # Check for common corruption indicators
        if [ -f "$db_path/CURRENT" ]; then
            # Check if CURRENT file ends with newline
            if [ -n "$(tail -c1 "$db_path/CURRENT" 2>/dev/null)" ]; then
                log_message "⚠ $db_name: CURRENT file doesn't end with newline - fixing..."
                echo "" >> "$db_path/CURRENT"
            fi
        fi
        
        # Check for missing MANIFEST files referenced in CURRENT
        if [ -f "$db_path/CURRENT" ]; then
            local manifest_file=$(cat "$db_path/CURRENT" 2>/dev/null | head -1)
            if [ -n "$manifest_file" ] && [ ! -f "$db_path/$manifest_file" ]; then
                log_message "⚠ $db_name: Missing MANIFEST file $manifest_file - database needs reset"
                return 1
            fi
        fi
        
        return 0
    fi
    return 0
}

# Function to reset a corrupted LevelDB
reset_leveldb() {
    local db_path="$1"
    local db_name="$2"
    
    log_message "🔧 Resetting corrupted LevelDB: $db_name"
    
    if [ -d "$db_path" ]; then
        rm -rf "$db_path"
        log_message "✅ Removed corrupted $db_name database"
    fi
    
    mkdir -p "$db_path"
    chown -R oasis:oasis "$db_path"
    log_message "✅ Created fresh $db_name database directory"
}

# Function to initialize SSB directory structure
initialize_ssb_structure() {
    log_message "🏗 Initializing SSB directory structure..."
    
    # Create main SSB directory
    mkdir -p "$SSB_PATH"
    chown oasis:oasis "$SSB_PATH"
    
    # Create subdirectories
    local subdirs=(
        "blobs"
        "blobs_push"
        "db"
        "flume"
        "flume/search"
        "node_modules"
    )
    
    for subdir in "${subdirs[@]}"; do
        mkdir -p "$SSB_PATH/$subdir"
        chown -R oasis:oasis "$SSB_PATH/$subdir"
        log_message "✅ Created directory: $SSB_PATH/$subdir"
    done
    
    # Create essential files if they don't exist
    local files=(
        "conn.json"
        "gossip.json"
        "gossip_unfollowed.json"
    )
    
    for file in "${files[@]}"; do
        if [ ! -f "$SSB_PATH/$file" ]; then
            echo "[]" > "$SSB_PATH/$file"
            chown oasis:oasis "$SSB_PATH/$file"
            log_message "✅ Created file: $SSB_PATH/$file"
        fi
    done
}

# Function to perform database recovery
perform_recovery() {
    log_message "🚀 Starting SSB database recovery..."
    
    # Initialize directory structure first
    initialize_ssb_structure
    
    # Check and recover specific databases
    local databases=(
        "$SSB_PATH/db:main"
        "$SSB_PATH/blobs_push:blobs_push"
        "$SSB_PATH/flume:flume"
        "$SSB_PATH/flume/search:search"
    )
    
    local corruption_found=false
    
    for db_entry in "${databases[@]}"; do
        IFS=':' read -r db_path db_name <<< "$db_entry"
        
        if ! check_leveldb_corruption "$db_path" "$db_name"; then
            reset_leveldb "$db_path" "$db_name"
            corruption_found=true
        else
            log_message "✅ $db_name database appears healthy"
        fi
    done
    
    if [ "$corruption_found" = true ]; then
        log_message "🔧 Database corruption detected and fixed"
    else
        log_message "✅ No database corruption detected"
    fi
    
    # Ensure proper permissions on the entire SSB directory
    chown -R oasis:oasis "$SSB_PATH"
    chmod -R 755 "$SSB_PATH"
    
    log_message "✅ SSB database recovery completed successfully"
}

# Function to create backup of SSB data before recovery
backup_ssb_data() {
    if [ -d "$SSB_PATH" ] && [ "$(ls -A $SSB_PATH 2>/dev/null)" ]; then
        local backup_dir="/app/backup/ssb-$(date +%Y%m%d-%H%M%S)"
        log_message "📦 Creating backup of existing SSB data at $backup_dir"
        
        mkdir -p "$backup_dir"
        cp -r "$SSB_PATH"/* "$backup_dir/" 2>/dev/null || true
        chown -R oasis:oasis "$backup_dir"
        
        log_message "✅ Backup created successfully"
    fi
}

# Main execution
main() {
    log_message "================================="
    log_message "SSB Database Recovery Script v1.0"
    log_message "================================="
    
    # Create logs directory
    mkdir -p "$(dirname "$RECOVERY_LOG")"
    
    # Check if running as root for initial setup
    if [ "$EUID" -eq 0 ]; then
        log_message "🔑 Running as root - performing system setup"
        
        # Create oasis user if it doesn't exist
        if ! id -u oasis >/dev/null 2>&1; then
            useradd -m -s /bin/bash oasis
            log_message "✅ Created oasis user"
        fi
        
        # Create backup if needed and perform recovery
        backup_ssb_data
        perform_recovery
        
        log_message "🎯 Switching to oasis user for final checks"
        su - oasis -c "bash $0 --user-mode"
    else
        log_message "👤 Running as user: $(whoami)"
        
        # User mode - just perform final checks
        if [ "$1" = "--user-mode" ]; then
            log_message "🔍 Performing final integrity checks as user"
            
            # Verify SSB directory is accessible
            if [ -r "$SSB_PATH" ] && [ -w "$SSB_PATH" ]; then
                log_message "✅ SSB directory is accessible by user oasis"
            else
                log_message "❌ SSB directory permissions issue"
                exit 1
            fi
        else
            # If not root and not in user mode, perform recovery as current user
            perform_recovery
        fi
    fi
    
    log_message "🎉 SSB recovery process completed successfully!"
}

# Execute main function
main "$@"