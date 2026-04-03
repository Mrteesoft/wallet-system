'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { before, after, test } = require('node:test');
const net = require('node:net');
const path = require('node:path');

const dotenv = require('dotenv');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { PrismaClient } = require('@prisma/client');

const rootDir = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const userServicePort = 56051;
const walletServicePort = 56052;
const createdUserIds = [];
const userServiceLogs = [];
const walletServiceLogs = [];

const prisma = new PrismaClient();

let userClient;
let walletClient;
let userProcess;
let walletProcess;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPort = (port, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    const startTime = Date.now();

    const attempt = () => {
      const socket = new net.Socket();

      socket
        .once('connect', () => {
          socket.destroy();
          resolve();
        })
        .once('error', () => {
          socket.destroy();

          if (Date.now() - startTime > timeoutMs) {
            reject(new Error(`Timed out waiting for port ${port}`));
            return;
          }

          setTimeout(attempt, 300);
        })
        .connect(port, '127.0.0.1');
    };

    attempt();
  });

const startService = (entryPoint, env, logs) => {
  const child = spawn(process.execPath, [entryPoint], {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    logs.push(chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    logs.push(chunk.toString());
  });

  return child;
};

const stopService = async (child) => {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill();

  await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(resolve, 5000);
  });
};

const loadProto = (fileName) =>
  grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(rootDir, 'packages', 'proto', fileName), {
      defaults: true,
      enums: String,
      keepCase: false,
      longs: String,
      oneofs: true,
    }),
  );

const userProto = loadProto('user.proto').user;
const walletProto = loadProto('wallet.proto').wallet;

const invokeUnary = (client, methodName, payload, metadata) =>
  new Promise((resolve, reject) => {
    client[methodName](payload, metadata ?? new grpc.Metadata(), (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    });
  });

before(async () => {
  const commonEnv = {
    ...process.env,
    LOG_PRETTY: 'false',
    NODE_ENV: 'test',
    USER_SERVICE_GRPC_HOST: '127.0.0.1',
    USER_SERVICE_GRPC_PORT: String(userServicePort),
    USER_SERVICE_GRPC_URL: `127.0.0.1:${userServicePort}`,
    WALLET_SERVICE_GRPC_HOST: '127.0.0.1',
    WALLET_SERVICE_GRPC_PORT: String(walletServicePort),
    WALLET_SERVICE_GRPC_URL: `127.0.0.1:${walletServicePort}`,
  };

  userProcess = startService(
    path.join(rootDir, 'dist', 'apps', 'user-service', 'src', 'main.js'),
    commonEnv,
    userServiceLogs,
  );
  walletProcess = startService(
    path.join(rootDir, 'dist', 'apps', 'wallet-service', 'src', 'main.js'),
    commonEnv,
    walletServiceLogs,
  );

  await Promise.all([waitForPort(userServicePort), waitForPort(walletServicePort)]);

  userClient = new userProto.UserService(
    `127.0.0.1:${userServicePort}`,
    grpc.credentials.createInsecure(),
  );
  walletClient = new walletProto.WalletService(
    `127.0.0.1:${walletServicePort}`,
    grpc.credentials.createInsecure(),
  );
});

after(async () => {
  if (walletClient) {
    walletClient.close();
  }

  if (userClient) {
    userClient.close();
  }

  if (createdUserIds.length > 0) {
    await prisma.wallet.deleteMany({
      where: {
        userId: {
          in: createdUserIds,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: createdUserIds,
        },
      },
    });
  }

  await prisma.$disconnect();
  await Promise.all([stopService(userProcess), stopService(walletProcess)]);
});

test('create user auto-provisions wallet and propagates request metadata', async () => {
  const requestId = randomUUID();
  const idempotencyKey = randomUUID();
  const metadata = new grpc.Metadata();
  metadata.set('x-request-id', requestId);
  metadata.set('x-idempotency-key', idempotencyKey);

  const createUserResponse = await invokeUnary(
    userClient,
    'createUser',
    {
      email: `integration-${Date.now()}@example.com`,
      name: 'Integration User',
    },
    metadata,
  );

  createdUserIds.push(createUserResponse.id);

  const walletResponse = await invokeUnary(
    walletClient,
    'getWallet',
    {
      userId: createUserResponse.id,
    },
    metadata,
  );

  await sleep(500);

  const combinedLogs = `${userServiceLogs.join('')}\n${walletServiceLogs.join('')}`;

  assert.ok(createUserResponse.id);
  assert.equal(walletResponse.userId, createUserResponse.id);
  assert.equal(walletResponse.balance, 0);
  assert.match(combinedLogs, new RegExp(requestId));
  assert.match(combinedLogs, new RegExp(idempotencyKey));
});

test('credit and debit wallet through gRPC', async () => {
  const createUserResponse = await invokeUnary(userClient, 'createUser', {
    email: `wallet-flow-${Date.now()}@example.com`,
    name: 'Wallet Flow User',
  });

  createdUserIds.push(createUserResponse.id);

  const creditedWallet = await invokeUnary(walletClient, 'creditWallet', {
    userId: createUserResponse.id,
    amount: 150,
  });

  assert.equal(creditedWallet.balance, 150);

  const debitedWallet = await invokeUnary(walletClient, 'debitWallet', {
    userId: createUserResponse.id,
    amount: 40,
  });

  assert.equal(debitedWallet.balance, 110);

  const fetchedWallet = await invokeUnary(walletClient, 'getWallet', {
    userId: createUserResponse.id,
  });

  assert.equal(fetchedWallet.balance, 110);
});

test('debit wallet rejects insufficient balance', async () => {
  const createUserResponse = await invokeUnary(userClient, 'createUser', {
    email: `insufficient-${Date.now()}@example.com`,
    name: 'Insufficient Balance User',
  });

  createdUserIds.push(createUserResponse.id);

  await assert.rejects(
    () =>
      invokeUnary(walletClient, 'debitWallet', {
        userId: createUserResponse.id,
        amount: 10,
      }),
    (error) => {
      assert.equal(error.code, grpc.status.FAILED_PRECONDITION);
      return true;
    },
  );
});
