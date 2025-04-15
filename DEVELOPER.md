# Developer Guide

This document provides instructions for setting up, building, and distributing the application for developers.

## Prerequisites

- [Node.js](https://nodejs.org/) and npm installed
- Git for version control
- For macOS users: Xcode Command Line Tools

## Getting Started

### Setup

1. Clone the repository:

   ```sh
   git clone https://github.com/dataterminalapp/dataterminal.git
   cd dataterminal
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

### Environment Configuration

#### Package Manager Notes

If you are using a package manager like `nix`, ensure that system libraries are properly linked before compiling:

```sh
# For macOS with nix
export LDFLAGS="-stdlib=libc++ -L/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib"
```

## Build Process

### Development Build

1. Rebuild native modules (necessary after fresh install or when native dependencies change):

   ```sh
   npm run rebuild
   ```

2. Start the application in development mode:
   ```sh
   npm start
   ```

### Troubleshooting Build Issues

- If you encounter compilation errors with native modules:
  - Verify that you have the proper build tools installed
  - Check that system libraries are correctly linked
  - On macOS, ensure Xcode Command Line Tools are installed: `xcode-select --install`

## Distribution

### Creating Application Packages

To create distributable packages for the current platform:

```sh
npm run package
```

The packaged application will be available at:
`/out/Data Terminal-{os}-{arch}/`

Where:

- `{os}` is your operating system (win32, darwin, linux)
- `{arch}` is your architecture (x64, arm64)

### Cross-Platform Building

To build for a specific platform from another:

```sh
npm run package -- --platform=[platform] --arch=[architecture]
```

Available platforms: darwin
Available architectures: arm64

## Release Management

### Publishing a New Release

To publish a new version and create a release:

1. Update the version in `package.json`
2. Create a new release:
   ```sh
   npm run publish
   ```

This process will:

- Build the application
- Create distributable packages
- Publish the release
- Trigger automatic update notifications for existing users

### Version Control Guidelines

- Follow [semantic versioning](https://semver.org/) for version numbers
- Create detailed release notes for each version
- Tag releases in the repository with version numbers

## Development Workflow

### Code Style and Linting

Maintain code quality by running:

```sh
npm run lint
```

To automatically fix linting issues:

```sh
npm run lint:fix
```

### Running Tests

Execute the test suite:

```sh
npm test
```

**Note:** Running the tests requires Docker to be installed and running on your system. Make sure that Docker is properly set up before running the test.

### UI Testing Guidelines

You will notice that tests primarily involve keyboard interactions. This is the preferred method for testing the UI—using the keyboard rather than searching for components by IDs or content.

## Support

For development support, please:

- Open an issue in the repository
- Contact the development team at contact@dataterminal.app
