import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface Config {
    project_path?: string;
    scheme: string;
    workspace?: string;
    project?: string;
    configuration?: string;
    team_id?: string;
    bundle_id?: string;
    app_store_connect_api_key_id?: string;
    app_store_connect_api_issuer_id?: string;
    app_store_connect_api_key_path?: string;
}

class IOSPipeline {
    private config: Config;
    private project_path: string;
    private scheme: string;
    private workspace?: string;
    private project?: string;
    private configuration: string;
    private team_id?: string;
    private bundle_id?: string;
    private app_store_connect_api_key_id?: string;
    private app_store_connect_api_issuer_id?: string;
    private app_store_connect_api_key_path?: string;
    private has_xcpretty: boolean = false;

    constructor(config: Config) {
        this.config = config;
        this.project_path = config.project_path || '.';
        this.scheme = config.scheme;
        this.workspace = config.workspace;
        this.project = config.project;
        this.configuration = config.configuration || 'Release';
        this.team_id = config.team_id;
        this.bundle_id = config.bundle_id;
        this.app_store_connect_api_key_id = config.app_store_connect_api_key_id;
        this.app_store_connect_api_issuer_id = config.app_store_connect_api_issuer_id;
        this.app_store_connect_api_key_path = config.app_store_connect_api_key_path;
    }

    private runCommand(command: string[], cwd: string = this.project_path): string {
        console.log(`🔧 Running: ${command.join(' ')}`);
        const options: ExecSyncOptionsWithStringEncoding = {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        };

        try {
            const output = execSync(command.join(' '), options);
            if (output) {
                console.log(`✅ Output: ${output}`);
            }
            return output.toString();
        } catch (error: any) {
            console.error(`❌ Error running command: ${error.message}`);
            console.error(`❌ Stderr: ${error.stderr || ''}`);
            console.error(`❌ Stdout: ${error.stdout || ''}`);
            throw error;
        }
    }

    checkPrerequisites(): boolean {
        console.log('🔍 Checking prerequisites...');

        try {
            this.runCommand(['xcodebuild', '-version']);
        } catch {
            console.error('❌ Xcode is not installed or not in PATH');
            return false;
        }

        try {
            execSync('xcpretty --version', { stdio: 'ignore' });
            this.has_xcpretty = true;
        } catch {
            console.log('⚠️ xcpretty not found. Install with: gem install xcpretty');
            this.has_xcpretty = false;
        }

        if (!this.workspace && !this.project) {
            console.error('❌ Either workspace or project must be specified');
            return false;
        }

        console.log('✅ Prerequisites check passed');
        return true;
    }

    cleanProject(): boolean {
        console.log('🧹 Cleaning project...');
        try {
            const buildTarget = this.workspace
                ? ['-workspace', this.workspace]
                : ['-project', this.project!];
            const command = ['xcodebuild', 'clean', ...buildTarget, '-scheme', this.scheme];
            this.runCommand(command);
            console.log('✅ Project cleaned successfully');
            return true;
        } catch {
            console.error('❌ Failed to clean project');
            return false;
        }
    }

    installDependencies(): boolean {
        const podfilePath = join(this.project_path, 'Podfile');
        if (existsSync(podfilePath)) {
            console.log('📦 Installing CocoaPods dependencies...');
            try {
                this.runCommand(['pod', 'install']);
                console.log('✅ CocoaPods dependencies installed');
                return true;
            } catch {
                console.error('❌ Failed to install CocoaPods dependencies');
                return false;
            }
        } else {
            console.log('ℹ️ No Podfile found, skipping dependency installation');
            return true;
        }
    }

    runTests(): boolean {
        console.log('🧪 Running tests...');
        try {
            const buildTarget = this.workspace
                ? ['-workspace', this.workspace]
                : ['-project', this.project!];
            const command = [
                'xcodebuild',
                'test',
                '-scheme',
                this.scheme,
                '-destination',
                'platform=iOS Simulator,name=iPhone 15,OS=latest',
                ...buildTarget,
            ];

            if (this.has_xcpretty) {
                const xcprettyCommand = [...command, '|', 'xcpretty', '--test', '--color'];
                this.runCommand(xcprettyCommand);
            } else {
                this.runCommand(command);
            }

            console.log('✅ All tests passed');
            return true;
        } catch {
            console.error('❌ Tests failed');
            return false;
        }
    }

    buildArchive(): string | null {
        console.log('🔨 Building and archiving app...');

        const archivePath = join(this.project_path, 'build', `${this.scheme}.xcarchive`);
        mkdirSync(join(this.project_path, 'build'), { recursive: true });

        try {
            const buildTarget = this.workspace
                ? ['-workspace', this.workspace]
                : ['-project', this.project!];
            const command = [
                'xcodebuild',
                'archive',
                '-scheme',
                this.scheme,
                '-configuration',
                this.configuration,
                '-archivePath',
                archivePath,
                '-destination',
                'generic/platform=iOS',
                ...buildTarget,
            ];

            if (this.team_id) {
                command.push('-allowProvisioningUpdates', `DEVELOPMENT_TEAM=${this.team_id}`);
            }

            this.runCommand(command);
            console.log(`✅ Archive created at: ${archivePath}`);
            return archivePath;
        } catch {
            console.error('❌ Failed to build archive');
            return null;
        }
    }

    exportIpa(archivePath: string): string | null {
        console.log('📦 Exporting IPA...');

        const exportPath = join(this.project_path, 'build', 'export');
        mkdirSync(exportPath, { recursive: true });

        const exportOptions: any = {
            method: 'app-store',
            uploadBitcode: false,
            uploadSymbols: true,
            compileBitcode: false,
        };

        if (this.team_id) {
            exportOptions.teamID = this.team_id;
        }

        const exportPlistPath = join(exportPath, 'ExportOptions.plist');
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
  <key>compileBitcode</key>
  <false/>
  ${this.team_id ? `<key>teamID</key><string>${this.team_id}</string>` : ''}
</dict>
</plist>`;
        writeFileSync(exportPlistPath, plistContent);

        try {
            const command = [
                'xcodebuild',
                '-exportArchive',
                '-archivePath',
                archivePath,
                '-exportPath',
                exportPath,
                '-exportOptionsPlist',
                exportPlistPath,
            ];

            this.runCommand(command);

            const ipaFiles = readdirSync(exportPath).filter((file: string) => file.endsWith('.ipa'));
            if (ipaFiles.length > 0) {
                const ipaPath = join(exportPath, ipaFiles[0]);
                console.log(`✅ IPA exported to: ${ipaPath}`);
                return ipaPath;
            } else {
                console.error('❌ No IPA file found after export');
                return null;
            }
        } catch {
            console.error('❌ Failed to export IPA');
            return null;
        }
    }

    uploadToTestFlight(ipaPath: string): boolean {
        console.log('🚀 Uploading to TestFlight...');

        try {
            const command = ['xcrun', 'altool', '--upload-app', '--file', ipaPath, '--type', 'ios'];

            if (
                this.app_store_connect_api_key_id &&
                this.app_store_connect_api_issuer_id &&
                this.app_store_connect_api_key_path
            ) {
                command.push(
                    '--apiKey',
                    this.app_store_connect_api_key_id,
                    '--apiIssuer',
                    this.app_store_connect_api_issuer_id
                );
                process.env.API_PRIVATE_KEYS_DIR = join(this.app_store_connect_api_key_path, '..');
            } else {
                console.log('⚠️ App Store Connect API credentials not provided');
                console.log("   You'll need to authenticate manually or provide API credentials");
            }

            this.runCommand(command);
            console.log('✅ Successfully uploaded to TestFlight');
            console.log('ℹ️ Processing may take a few minutes in App Store Connect');
            return true;
        } catch (error: any) {
            console.error(`❌ Upload error: ${error.message}`);
            return false;
        }
    }

    incrementBuildNumber(): boolean {
        console.log('🔢 Incrementing build number...');
        try {
            this.runCommand(['xcrun', 'agvtool', 'next-version', '-all']);
            console.log('✅ Build number incremented');
            return true;
        } catch {
            console.error('❌ Failed to increment build number');
            return false;
        }
    }

    async runPipeline(skipTests: boolean = false, skipUpload: boolean = false): Promise<boolean> {
        console.log('🚀 Starting iOS CI/CD Pipeline');
        console.log('='.repeat(50));

        if (!this.checkPrerequisites()) {
            return false;
        }

        if (!this.installDependencies()) {
            return false;
        }

        if (!this.cleanProject()) {
            return false;
        }

        if (!this.incrementBuildNumber()) {
            console.log('⚠️ Failed to increment build number, continuing...');
        }

        if (!skipTests) {
            if (!this.runTests()) {
                return false;
            }
        } else {
            console.log('⏭️ Skipping tests');
        }

        const archivePath = this.buildArchive();
        if (!archivePath) {
            return false;
        }

        const ipaPath = this.exportIpa(archivePath);
        if (!ipaPath) {
            return false;
        }

        if (!skipUpload) {
            if (!this.uploadToTestFlight(ipaPath)) {
                return false;
            }
        } else {
            console.log('⏭️ Skipping TestFlight upload');
            console.log(`📦 IPA ready for manual upload: ${ipaPath}`);
        }

        console.log('='.repeat(50));
        console.log('🎉 Pipeline completed successfully!');
        return true;
    }
}

function loadConfig(configPath: string): Config {
    try {
        const data = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(data);
        if (!config.scheme) {
            throw new Error('Missing required field: scheme');
        }
        return config;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error(`❌ Configuration file not found: ${configPath}`);
        } else {
            console.error(`❌ Invalid JSON in configuration file: ${error.message}`);
        }
        return { scheme: '' };
    }
}

async function main(): Promise<void> {
    const argv = yargs(hideBin(process.argv))
        .option('config', { type: 'string', alias: 'c', default: 'ios-pipeline-config.json' })
        .option('scheme', { type: 'string' })
        .option('workspace', { type: 'string' })
        .option('project', { type: 'string' })
        .option('skip-tests', { type: 'boolean', default: false })
        .option('skip-upload', { type: 'boolean', default: false })
        .parseSync();

    const config = loadConfig(argv.config as string);

    // Override config file with CLI args if provided
    if (argv.scheme) config.scheme = argv.scheme;
    if (argv.workspace) config.workspace = argv.workspace;
    if (argv.project) config.project = argv.project;

    const pipeline = new IOSPipeline(config);
    const success = await pipeline.runPipeline(argv['skip-tests'] ?? false, argv['skip-upload'] ?? false);

    process.exit(success ? 0 : 1);
}

main().catch((error) => {
    console.error(`❌ Pipeline failed: ${error.message}`);
    process.exit(1);
});
