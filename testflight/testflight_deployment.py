"""
iOS CI/CD Pipeline Script for TestFlight Deployment
Handles building, testing, and uploading iOS apps to TestFlight
"""

import os
import sys
import subprocess
import json
import argparse
import time
from pathlib import Path
from typing import Dict, List, Optional

class IOSPipeline:
    def __init__(self, config: Dict):
        self.config = config
        self.project_path = config.get('project_path', '.')
        self.scheme = config.get('scheme')
        self.workspace = config.get('workspace')
        self.project = config.get('project')
        self.configuration = config.get('configuration', 'Release')
        self.team_id = config.get('team_id')
        self.bundle_id = config.get('bundle_id')
        self.app_store_connect_api_key_id = config.get('app_store_connect_api_key_id')
        self.app_store_connect_api_issuer_id = config.get('app_store_connect_api_issuer_id')
        self.app_store_connect_api_key_path = config.get('app_store_connect_api_key_path')

    def run_command(self, command: List[str], cwd: Optional[str] = None) -> subprocess.CompletedProcess:
        """Execute a shell command and return the result"""
        print(f"🔧 Running: {' '.join(command)}")
        try:
            result = subprocess.run(
                command,
                cwd=cwd or self.project_path,
                capture_output=True,
                text=True,
                check=True
            )
            if result.stdout:
                print(f"✅ Output: {result.stdout}")
            return result
        except subprocess.CalledProcessError as e:
            print(f"❌ Error running command: {e}")
            print(f"❌ Stderr: {e.stderr}")
            print(f"❌ Stdout: {e.stdout}")
            raise

    def check_prerequisites(self) -> bool:
        """Check if all required tools and configurations are available"""
        print("🔍 Checking prerequisites...")

        # Check if Xcode is installed
        try:
            self.run_command(['xcodebuild', '-version'])
        except subprocess.CalledProcessError:
            print("❌ Xcode is not installed or not in PATH")
            return False

        # Check if xcpretty is available (optional but recommended)
        try:
            subprocess.run(['xcpretty', '--version'], capture_output=True, check=True)
            self.has_xcpretty = True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⚠️  xcpretty not found. Install with: gem install xcpretty")
            self.has_xcpretty = False

        # Check required configuration
        required_fields = ['scheme']
        if not (self.workspace or self.project):
            print("❌ Either workspace or project must be specified")
            return False

        for field in required_fields:
            if not getattr(self, field):
                print(f"❌ Missing required configuration: {field}")
                return False

        print("✅ Prerequisites check passed")
        return True

    def clean_project(self) -> bool:
        """Clean the project"""
        print("🧹 Cleaning project...")
        try:
            build_target = ['-workspace', self.workspace] if self.workspace else ['-project', self.project]
            command = ['xcodebuild', 'clean'] + build_target + ['-scheme', self.scheme]
            self.run_command(command)
            print("✅ Project cleaned successfully")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to clean project")
            return False

    def install_dependencies(self) -> bool:
        """Install CocoaPods dependencies if Podfile exists"""
        podfile_path = Path(self.project_path) / 'Podfile'
        if podfile_path.exists():
            print("📦 Installing CocoaPods dependencies...")
            try:
                self.run_command(['pod', 'install'])
                print("✅ CocoaPods dependencies installed")
                return True
            except subprocess.CalledProcessError:
                print("❌ Failed to install CocoaPods dependencies")
                return False
        else:
            print("ℹ️  No Podfile found, skipping dependency installation")
            return True

    def run_tests(self) -> bool:
        """Run unit and UI tests"""
        print("🧪 Running tests...")
        try:
            build_target = ['-workspace', self.workspace] if self.workspace else ['-project', self.project]
            command = [
                          'xcodebuild', 'test',
                          '-scheme', self.scheme,
                          '-destination', 'platform=iOS Simulator,name=iPhone 15,OS=latest'
                      ] + build_target

            if self.has_xcpretty:
                # Pipe output through xcpretty for better formatting
                xcodebuild = subprocess.Popen(
                    command,
                    cwd=self.project_path,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True
                )
                xcpretty = subprocess.Popen(
                    ['xcpretty', '--test', '--color'],
                    stdin=xcodebuild.stdout,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                xcodebuild.stdout.close()
                output, error = xcpretty.communicate()

                if xcodebuild.wait() != 0 or xcpretty.returncode != 0:
                    raise subprocess.CalledProcessError(1, command)
                print(output)
            else:
                self.run_command(command)

            print("✅ All tests passed")
            return True
        except subprocess.CalledProcessError:
            print("❌ Tests failed")
            return False

    def build_archive(self) -> Optional[str]:
        """Build and archive the app"""
        print("🔨 Building and archiving app...")

        archive_path = Path(self.project_path) / 'build' / f'{self.scheme}.xcarchive'
        archive_path.parent.mkdir(exist_ok=True)

        try:
            build_target = ['-workspace', self.workspace] if self.workspace else ['-project', self.project]
            command = [
                          'xcodebuild', 'archive',
                          '-scheme', self.scheme,
                          '-configuration', self.configuration,
                          '-archivePath', str(archive_path),
                          '-destination', 'generic/platform=iOS'
                      ] + build_target

            if self.team_id:
                command.extend(['-allowProvisioningUpdates'])
                command.extend(['DEVELOPMENT_TEAM=' + self.team_id])

            self.run_command(command)
            print(f"✅ Archive created at: {archive_path}")
            return str(archive_path)
        except subprocess.CalledProcessError:
            print("❌ Failed to build archive")
            return None

    def export_ipa(self, archive_path: str) -> Optional[str]:
        """Export IPA from archive"""
        print("📦 Exporting IPA...")

        export_path = Path(self.project_path) / 'build' / 'export'
        export_path.mkdir(exist_ok=True)

        # Create export options plist
        export_options = {
            'method': 'app-store',
            'uploadBitcode': False,
            'uploadSymbols': True,
            'compileBitcode': False
        }

        if self.team_id:
            export_options['teamID'] = self.team_id

        export_plist_path = export_path / 'ExportOptions.plist'

        # Convert dict to plist format
        import plistlib
        with open(export_plist_path, 'wb') as f:
            plistlib.dump(export_options, f)

        try:
            command = [
                'xcodebuild', '-exportArchive',
                '-archivePath', archive_path,
                '-exportPath', str(export_path),
                '-exportOptionsPlist', str(export_plist_path)
            ]

            self.run_command(command)

            # Find the exported IPA file
            ipa_files = list(export_path.glob('*.ipa'))
            if ipa_files:
                ipa_path = ipa_files[0]
                print(f"✅ IPA exported to: {ipa_path}")
                return str(ipa_path)
            else:
                print("❌ No IPA file found after export")
                return None
        except subprocess.CalledProcessError:
            print("❌ Failed to export IPA")
            return None

    def upload_to_testflight(self, ipa_path: str) -> bool:
        """Upload IPA to TestFlight using App Store Connect API"""
        print("🚀 Uploading to TestFlight...")

        try:
            command = ['xcrun', 'altool', '--upload-app', '--file', ipa_path, '--type', 'ios']

            # Use App Store Connect API key if available
            if all([self.app_store_connect_api_key_id,
                    self.app_store_connect_api_issuer_id,
                    self.app_store_connect_api_key_path]):
                command.extend([
                    '--apiKey', self.app_store_connect_api_key_id,
                    '--apiIssuer', self.app_store_connect_api_issuer_id
                ])

                # Set the API key file path as environment variable
                env = os.environ.copy()
                env['API_PRIVATE_KEYS_DIR'] = str(Path(self.app_store_connect_api_key_path).parent)
            else:
                print("⚠️  App Store Connect API credentials not provided")
                print("   You'll need to authenticate manually or provide API credentials")
                env = None

            result = subprocess.run(
                command,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                env=env
            )

            if result.returncode == 0:
                print("✅ Successfully uploaded to TestFlight")
                print("ℹ️  Processing may take a few minutes in App Store Connect")
                return True
            else:
                print(f"❌ Upload failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"❌ Upload error: {e}")
            return False

    def increment_build_number(self) -> bool:
        """Increment the build number in Info.plist"""
        print("🔢 Incrementing build number...")
        try:
            command = [
                'xcrun', 'agvtool', 'next-version', '-all'
            ]
            self.run_command(command)
            print("✅ Build number incremented")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to increment build number")
            return False

    def run_pipeline(self, skip_tests: bool = False, skip_upload: bool = False) -> bool:
        """Run the complete CI/CD pipeline"""
        print("🚀 Starting iOS CI/CD Pipeline")
        print("=" * 50)

        # Check prerequisites
        if not self.check_prerequisites():
            return False

        # Install dependencies
        if not self.install_dependencies():
            return False

        # Clean project
        if not self.clean_project():
            return False

        # Increment build number
        if not self.increment_build_number():
            print("⚠️  Failed to increment build number, continuing...")

        # Run tests
        if not skip_tests:
            if not self.run_tests():
                return False
        else:
            print("⏭️  Skipping tests")

        # Build archive
        archive_path = self.build_archive()
        if not archive_path:
            return False

        # Export IPA
        ipa_path = self.export_ipa(archive_path)
        if not ipa_path:
            return False

        # Upload to TestFlight
        if not skip_upload:
            if not self.upload_to_testflight(ipa_path):
                return False
        else:
            print("⏭️  Skipping TestFlight upload")
            print(f"📦 IPA ready for manual upload: {ipa_path}")

        print("=" * 50)
        print("🎉 Pipeline completed successfully!")
        return True

def load_config(config_path: str) -> Dict:
    """Load configuration from JSON file"""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Configuration file not found: {config_path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in configuration file: {e}")
        return {}

def main():
    parser = argparse.ArgumentParser(description='iOS CI/CD Pipeline for TestFlight')
    parser.add_argument('--config', '-c', default='ios-pipeline-config.json',
                        help='Path to configuration JSON file')
    parser.add_argument('--skip-tests', action='store_true',
                        help='Skip running tests')
    parser.add_argument('--skip-upload', action='store_true',
                        help='Skip uploading to TestFlight')
    parser.add_argument('--scheme', help='Override scheme from config')
    parser.add_argument('--workspace', help='Override workspace from config')
    parser.add_argument('--project', help='Override project from config')

    args = parser.parse_args()

    # Load configuration
    config = load_config(args.config)

    # Override with command line arguments
    if args.scheme:
        config['scheme'] = args.scheme
    if args.workspace:
        config['workspace'] = args.workspace
    if args.project:
        config['project'] = args.project

    # Create and run pipeline
    pipeline = IOSPipeline(config)
    success = pipeline.run_pipeline(
        skip_tests=args.skip_tests,
        skip_upload=args.skip_upload
    )

    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()