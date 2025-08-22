# VitalChain - Birth & Death Certificate Blockchain

## Overview

VitalChain is a blockchain-based solution for vital records issuance for births and deaths with instant verification. Built on the Stacks blockchain, it anchors certificates and amendments while allowing authorized entities to validate authenticity without central bottlenecks.

## Features

- **Decentralized Vital Records**: Secure issuance of birth and death certificates on the blockchain
- **Instant Verification**: Real-time authentication of certificates without central authority
- **Amendment Support**: Track and anchor certificate amendments transparently
- **Authorized Access**: Role-based validation for authorized entities

## Tech Stack

- **Blockchain**: Stacks
- **Smart Contracts**: Clarity
- **Testing**: Vitest with Clarinet SDK
- **Language**: TypeScript

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- [Clarinet](https://www.hiro.so/clarinet) (for smart contract development)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vitalchain-birth-death-certificate-blockchain
```

2. Install dependencies:
```bash
npm install
```

## Project Structure

```
vitalchain-birth-death-certificate-blockchain/
├── contracts/          # Clarity smart contracts
├── tests/             # Test files
├── settings/          # Configuration settings
├── package.json       # Node.js dependencies
├── Clarinet.toml      # Clarinet configuration
├── tsconfig.json      # TypeScript configuration
└── vitest.config.js   # Vitest test configuration
```

## Running Tests

Run the test suite:
```bash
npm test
```

Run tests with coverage report:
```bash
npm run test:report
```

Watch mode for continuous testing:
```bash
npm run test:watch
```

## Development

This project uses Clarinet for smart contract development. To start developing:

1. Write your Clarity smart contracts in the `contracts/` directory
2. Add contract configurations to `Clarinet.toml`
3. Write tests in the `tests/` directory
4. Use Clarinet commands for deployment and interaction

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

For questions or support, please open an issue in the repository.
