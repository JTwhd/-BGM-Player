use std::env;
use std::fs;
use std::path::Path;

fn main() {
    copy_resources().unwrap_or_else(|e| eprintln!("Warning: failed to copy resources: {}", e));

    tauri_build::build()
}

fn copy_resources() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR")?;
    
    let resources_src = Path::new(&manifest_dir).join("resources");
    let resources_dst = Path::new(&manifest_dir).join("target").join("release").join("resources");
    
    if resources_src.exists() && resources_src.is_dir() {
        if resources_dst.exists() {
            fs::remove_dir_all(&resources_dst)?;
        }
        fs::create_dir_all(&resources_dst)?;
        
        for entry in fs::read_dir(&resources_src)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                let filename = path.file_name().ok_or("invalid filename")?;
                fs::copy(&path, resources_dst.join(filename))?;
            }
        }
        
        println!("cargo:info=Copied resources to {}", resources_dst.display());
    }
    
    Ok(())
}
