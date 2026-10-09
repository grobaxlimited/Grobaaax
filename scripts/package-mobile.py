#!/usr/bin/env python3
import os
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = os.path.join(ROOT_DIR, "public", "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

def zip_directory(source_dir, output_zip_path, base_archive_folder):
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                abs_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_file_path, source_dir)
                archive_name = os.path.join(base_archive_folder, rel_path)
                zipf.write(abs_file_path, archive_name)

def create_packages():
    android_src = os.path.join(ROOT_DIR, "android")
    ios_src = os.path.join(ROOT_DIR, "ios")
    guide_src = os.path.join(ROOT_DIR, "MOBILE_PACKAGING_GUIDE.md")
    cap_config_src = os.path.join(ROOT_DIR, "capacitor.config.ts")

    # 1. Android Package
    android_zip = os.path.join(DOWNLOADS_DIR, "grobaax-android-project.zip")
    print("Packaging Android project into:", android_zip)
    with zipfile.ZipFile(android_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        if os.path.exists(guide_src):
            zipf.write(guide_src, "grobaax-android/MOBILE_PACKAGING_GUIDE.md")
        if os.path.exists(cap_config_src):
            zipf.write(cap_config_src, "grobaax-android/capacitor.config.ts")
        for root, dirs, files in os.walk(android_src):
            for file in files:
                abs_path = os.path.join(root, file)
                rel = os.path.relpath(abs_path, ROOT_DIR)
                zipf.write(abs_path, os.path.join("grobaax-android", rel))

    # 2. iOS Package
    ios_zip = os.path.join(DOWNLOADS_DIR, "grobaax-ios-project.zip")
    print("Packaging iOS project into:", ios_zip)
    with zipfile.ZipFile(ios_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        if os.path.exists(guide_src):
            zipf.write(guide_src, "grobaax-ios/MOBILE_PACKAGING_GUIDE.md")
        if os.path.exists(cap_config_src):
            zipf.write(cap_config_src, "grobaax-ios/capacitor.config.ts")
        for root, dirs, files in os.walk(ios_src):
            for file in files:
                abs_path = os.path.join(root, file)
                rel = os.path.relpath(abs_path, ROOT_DIR)
                zipf.write(abs_path, os.path.join("grobaax-ios", rel))

    # 3. Complete Packaging Suite
    suite_zip = os.path.join(DOWNLOADS_DIR, "grobaax-mobile-packaging-suite.zip")
    print("Packaging complete Mobile Suite into:", suite_zip)
    with zipfile.ZipFile(suite_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        if os.path.exists(guide_src):
            zipf.write(guide_src, "grobaax-mobile-suite/MOBILE_PACKAGING_GUIDE.md")
        if os.path.exists(cap_config_src):
            zipf.write(cap_config_src, "grobaax-mobile-suite/capacitor.config.ts")
        for folder in ["android", "ios"]:
            src_folder = os.path.join(ROOT_DIR, folder)
            for root, dirs, files in os.walk(src_folder):
                for file in files:
                    abs_path = os.path.join(root, file)
                    rel = os.path.relpath(abs_path, ROOT_DIR)
                    zipf.write(abs_path, os.path.join("grobaax-mobile-suite", rel))

    print("Mobile packaging complete! Files generated in:", DOWNLOADS_DIR)
    for f in os.listdir(DOWNLOADS_DIR):
        p = os.path.join(DOWNLOADS_DIR, f)
        print(f"  {f} ({os.path.getsize(p):,} bytes)")

if __name__ == "__main__":
    create_packages()
