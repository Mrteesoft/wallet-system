# Wallet System

This repository contains a NestJS microservice-based wallet system built in a monorepo structure. The solution uses gRPC for inter-service communication, Prisma ORM for database access, and PostgreSQL as the target database.

## Architecture

- `apps/user-service`
  - Owns user creation and user lookup
  - Exposes `CreateUser` and `GetUserById` over gRPC
  - Automatically provisions a wallet by calling `WalletService.CreateWallet`
- `apps/wallet-service`
  - Owns wallet creation and wallet balance operations
  - Exposes `CreateWallet`, `GetWallet`, `CreditWallet`, and `DebitWallet` over gRPC
  - Verifies user existence by calling `UserService.GetUserById`
- `packages/proto`
  - Shared gRPC contract definitions
- `packages/prisma`
  - Shared Prisma schema and generated migration files
- `packages/common`
  - Shared base classes and common infrastructure utilities

## Shared Base-Class Structure

To avoid duplicating plumbing code across services, shared technical behavior lives in reusable base classes:

- `BaseEntityGrpcService<TEntity, TResponse>`
  - abstract service base class used by both microservices
  - forces each service subclass to define its own response mapping
- `BaseGrpcService`
  - shared gRPC error helpers
  - shared validation helper for positive amounts
- `BaseEntityRepository<TEntity, TCreateData>`
  - abstract repository base class used by service-specific repositories
  - provides shared `findByIdOrThrow` and entity guard helpers
- `BaseRepository`
  - shared Prisma helpers for numeric conversion

Business logic is still kept inside each microservice so service boundaries remain clear.

## Tech Stack

- NestJS microservices
- gRPC
- Prisma ORM
- PostgreSQL
- `class-validator`

## Project Structure

```text
wallet-system/
|-- apps/
|   |-- user-service/
|   `-- wallet-service/
|-- packages/
|   |-- common/
|   |-- prisma/
|   `-- proto/
`-- README.md
```

## Features

### User Service

- Create a user
- Get a user by id
- Automatically create a wallet when a user is created

### Wallet Service

- Create a wallet for a user
- Get wallet by `userId`
- Credit wallet
- Debit wallet

## Validation and Error Handling

- DTO validation with `class-validator`
- gRPC errors for:
  - user not found
  - wallet not found
  - duplicate email
  - duplicate wallet
  - insufficient balance
- transaction-safe wallet debit using Prisma `$transaction`

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+

## Environment Variables

Create a `.env` file in the project root. Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/backend_assessment?schema=public"
USER_SERVICE_GRPC_HOST=0.0.0.0
USER_SERVICE_GRPC_PORT=50051
USER_SERVICE_GRPC_URL=localhost:50051
WALLET_SERVICE_GRPC_HOST=0.0.0.0
WALLET_SERVICE_GRPC_PORT=50052
WALLET_SERVICE_GRPC_URL=localhost:50052
```

You can copy `.env.example` to `.env`.

## Install Dependencies

```bash
npm install
```

## Start PostgreSQL

Create a PostgreSQL database named `backend_assessment` and update `DATABASE_URL` if your local credentials or port differ from the default example.

## Prisma Commands

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations against a live PostgreSQL database:

```bash
npm run prisma:migrate
```

An initial SQL migration is already included under `packages/prisma/migrations/`.

## Run the Services

Start user service:

```bash
npm run start:user-service
```

Start wallet service:

```bash
npm run start:wallet-service
```

Run both in separate terminals or use:

```bash
npm run start:dev
```

## Build

```bash
npm run build
```

## gRPC Endpoints

### User Service

- `CreateUser`
- `GetUserById`

### Wallet Service

- `CreateWallet`
- `GetWallet`
- `CreditWallet`
- `DebitWallet`

## API Testing

The required service contract in this assessment is gRPC, so API testing is shown with:

- Postman gRPC
- `grpcurl` as the curl-style command-line equivalent for gRPC

Money values are serialized as decimal strings in the wallet contract so request and response payloads do not lose precision over gRPC.

Proto files:

- `packages/proto/user.proto`
- `packages/proto/wallet.proto`

Service addresses:

- User service: `localhost:50051`
- Wallet service: `localhost:50052`

### Postman gRPC Setup

For `CreateUser` and `GetUserById`:

- Server: `localhost:50051`
- Proto file: `packages/proto/user.proto`

For `CreateWallet`, `GetWallet`, `CreditWallet`, and `DebitWallet`:

- Server: `localhost:50052`
- Proto file: `packages/proto/wallet.proto`

Optional gRPC metadata headers for tracing:

- `x-request-id`
- `x-idempotency-key`

If provided, these values are logged and propagated across inter-service gRPC calls.

### Example Requests

#### 1. Create user

Postman gRPC method:

```text
user.UserService/CreateUser
```

Postman message body:

```json
{
  "email": "jane@example.com",
  "name": "Jane Doe"
}
```

`grpcurl` example:

```bash
grpcurl -plaintext -import-path packages/proto -proto user.proto -d "{\"email\":\"jane@example.com\",\"name\":\"Jane Doe\"}" localhost:50051 user.UserService/CreateUser
```

Example response:

```json
{
  "id": "generated-user-id",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "createdAt": "2026-04-03T10:00:00.000Z"
}
```

This call also triggers wallet provisioning through `WalletService.CreateWallet`.

#### 2. Create wallet

Postman gRPC method:

```text
wallet.WalletService/CreateWallet
```

Postman message body:

```json
{
  "userId": "generated-user-id"
}
```

`grpcurl` example:

```bash
grpcurl -plaintext -import-path packages/proto -proto wallet.proto -d "{\"userId\":\"generated-user-id\"}" localhost:50052 wallet.WalletService/CreateWallet
```

Note: `CreateWallet` is still exposed because it is part of the required wallet-service contract. In the normal flow it is invoked automatically by `CreateUser`, so a direct repeated call for the same user will usually return `ALREADY_EXISTS`.

#### 3. Credit wallet

Postman gRPC method:

```text
wallet.WalletService/CreditWallet
```

Postman message body:

```json
{
  "userId": "generated-user-id",
  "amount": "150.00"
}
```

`grpcurl` example:

```bash
grpcurl -plaintext -import-path packages/proto -proto wallet.proto -d "{\"userId\":\"generated-user-id\",\"amount\":\"150.00\"}" localhost:50052 wallet.WalletService/CreditWallet
```

#### 4. Debit wallet

Postman gRPC method:

```text
wallet.WalletService/DebitWallet
```

Postman message body:

```json
{
  "userId": "generated-user-id",
  "amount": "40.00"
}
```

`grpcurl` example:

```bash
grpcurl -plaintext -import-path packages/proto -proto wallet.proto -d "{\"userId\":\"generated-user-id\",\"amount\":\"40.00\"}" localhost:50052 wallet.WalletService/DebitWallet
```

#### 5. Get wallet

Postman gRPC method:

```text
wallet.WalletService/GetWallet
```

Postman message body:

```json
{
  "userId": "generated-user-id"
}
```

`grpcurl` example:

```bash
grpcurl -plaintext -import-path packages/proto -proto wallet.proto -d "{\"userId\":\"generated-user-id\"}" localhost:50052 wallet.WalletService/GetWallet
```

#### 6. Get user by id

Postman gRPC method:

```text
user.UserService/GetUserById
```

Postman message body:

```json
{
  "id": "generated-user-id"
}
```

`grpcurl` example:

```bash
grpcurl -plaintext -import-path packages/proto -proto user.proto -d "{\"id\":\"generated-user-id\"}" localhost:50051 user.UserService/GetUserById
```

### Suggested Test Order

1. `CreateUser`
2. `GetWallet`
3. `CreditWallet`
4. `DebitWallet`
5. `GetWallet`
6. `CreateWallet` to confirm duplicate-wallet protection

## Notes

- When a user is created through `UserService.CreateUser`, the user service automatically provisions a wallet by calling `WalletService.CreateWallet` over gRPC.
- The wallet service never uses user business logic directly. It validates user existence by calling the user service over gRPC.
- A single PostgreSQL database is used for the assessment to keep setup simple, while service boundaries are preserved in code.
- The Prisma schema intentionally avoids a direct relation between `User` and `Wallet` so each service keeps ownership of its own model.
- Structured logging is implemented with `nestjs-pino`, and logs include request correlation data when `x-request-id` or `x-idempotency-key` metadata is supplied.
