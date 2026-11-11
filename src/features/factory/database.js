import { mutateState } from './model.js';
import { seedState } from './seed.js';

const DB_NAME = 'brassworks-phase1-demo';
const STORE = 'workspace';
let connection;
let channel;
const listeners = new Set();

function openDatabase() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new Error('This browser cannot save demo data. Enable browser storage and try again.'),
      );
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () =>
      reject(new Error('Could not open browser storage. Try a normal browser window.'));
    request.onblocked = () => reject(new Error('Close older Brassworks tabs and try again.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };
  }).catch((error) => {
    connection = null;
    throw error;
  });
  return connection;
}

function announce(state, broadcast = true) {
  listeners.forEach((listener) => listener(state));
  if (broadcast && channel) channel.postMessage({ revision: state.revision });
}

async function transaction(transform) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const read = store.get('current');
    let result;
    let failure;
    read.onsuccess = () => {
      try {
        const current = read.result ?? seedState();
        result = transform(current);
        store.put(result.state, 'current');
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      announce(result.state);
      resolve(result.value);
    };
    tx.onerror = () =>
      reject(failure ?? new Error('Could not save demo data. Browser storage may be full.'));
    tx.onabort = () => reject(failure ?? new Error('The save was cancelled. No data changed.'));
  });
}

export async function refreshDemo() {
  const db = await openDatabase();
  const state = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const read = tx.objectStore(STORE).get('current');
    read.onsuccess = () => resolve(read.result);
    read.onerror = () => reject(new Error('Could not read browser data.'));
  });
  if (!state) return transaction((current) => ({ state: current, value: current }));
  if (
    state.version !== 1 ||
    !['heats', 'billets', 'plans', 'outputs'].every((key) => Array.isArray(state[key])) ||
    !state.masters
  )
    throw new Error('Stored demo data is not readable. Reset the demo to recover.');
  announce(state, false);
  return state;
}

export function subscribeDemo(listener) {
  listeners.add(listener);
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(DB_NAME);
    channel.onmessage = () => {
      refreshDemo().catch(() => {});
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && channel) {
      channel.close();
      channel = null;
    }
  };
}

export function saveDemo(action) {
  return transaction((current) => mutateState(current, action));
}

export function resetDemo() {
  return transaction((current) => {
    const state = seedState();
    state.revision = (Number.isSafeInteger(current?.revision) ? current.revision : 0) + 1;
    return { state, value: state };
  });
}
