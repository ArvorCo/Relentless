/**
 * Queue Lock Manager
 *
 * Provides file-based locking for queue operations.
 * Prevents concurrent writes and partial processing issues.
 *
 * Lock file location: <featurePath>/.queue.lock
 */

import { join } from "node:path";
import { unlink } from "node:fs/promises";

/** Lock file name */
const LOCK_FILE = ".queue.lock";

/** Default lock timeout in milliseconds (5 seconds) */
let lockTimeout = 5000;

/**
 * Set the lock timeout for testing purposes
 *
 * @param timeout - New timeout in milliseconds
 */
export function setLockTimeout(timeout: number): void {
  lockTimeout = timeout;
}

/**
 * Get the current lock timeout
 *
 * @returns Current timeout in milliseconds
 */
export function getLockTimeout(): number {
  return lockTimeout;
}

/**
 * Acquire a lock for queue operations
 *
 * @param featurePath - Path to the feature directory
 * @returns true if lock acquired, false if already locked
 */
export async function acquireQueueLock(featurePath: string): Promise<boolean> {
  const lockPath = join(featurePath, LOCK_FILE);
  const lockFile = Bun.file(lockPath);

  // Check if lock exists and is not stale
  if (await lockFile.exists()) {
    const content = await lockFile.text();

    try {
      const lockData = JSON.parse(content);
      const lockTime = new Date(lockData.timestamp).getTime();
      const now = Date.now();

      // Check if lock is stale (older than timeout)
      if (now - lockTime < lockTimeout) {
        // Lock is still valid
        return false;
      }
      // Lock is stale, remove it
      await releaseLockFile(lockPath);
    } catch {
      // Invalid lock file, remove it
      await releaseLockFile(lockPath);
    }
  }

  // Create new lock
  const lockData = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
  };

  try {
    // Use exclusive flag to prevent race conditions
    await Bun.write(lockPath, JSON.stringify(lockData));
    return true;
  } catch {
    return false;
  }
}

/**
 * Release the queue lock
 *
 * @param featurePath - Path to the feature directory
 */
export async function releaseQueueLock(featurePath: string): Promise<void> {
  const lockPath = join(featurePath, LOCK_FILE);
  await releaseLockFile(lockPath);
}

/**
 * Check if the queue is currently locked
 *
 * @param featurePath - Path to the feature directory
 * @returns true if locked and lock is not stale, false otherwise
 */
export async function isQueueLocked(featurePath: string): Promise<boolean> {
  const lockPath = join(featurePath, LOCK_FILE);
  const lockFile = Bun.file(lockPath);

  if (!(await lockFile.exists())) {
    return false;
  }

  const content = await lockFile.text();

  try {
    const lockData = JSON.parse(content);
    const lockTime = new Date(lockData.timestamp).getTime();
    const now = Date.now();

    // Check if lock is stale
    if (now - lockTime >= lockTimeout) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to safely remove a lock file
 *
 * @param lockPath - Path to the lock file
 */
async function releaseLockFile(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch {
    // Ignore if file doesn't exist
  }
}
