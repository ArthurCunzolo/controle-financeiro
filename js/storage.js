/**
 * storage.js — IndexedDB Storage Layer
 *
 * Provides a repository abstraction over IndexedDB for all entities.
 * Supports per-user data isolation via userId tagging.
 *
 * Raw methods (getAllRaw, addRaw, etc.) bypass user scoping — used for
 * the users store. Regular methods (getAll, add, etc.) automatically
 * scope data to the currently logged-in user.
 */

const DB_NAME = "FinancialAssistantDB";
const DB_VERSION = 3;

class StorageService {
  constructor() {
    this.db = null;
  }

  /** Initialize the database and create object stores */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Users store (new in v2)
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "id" });
          userStore.createIndex("username", "username", { unique: true });
        }

        // Bills store
        if (!db.objectStoreNames.contains("bills")) {
          const billStore = db.createObjectStore("bills", { keyPath: "id" });
          billStore.createIndex("category", "category", { unique: false });
          billStore.createIndex("dueDate", "dueDate", { unique: false });
          billStore.createIndex("status", "status", { unique: false });
          billStore.createIndex("type", "type", { unique: false });
          billStore.createIndex("userId", "userId", { unique: false });
        } else {
          // Add userId index if upgrading from v1
          const tx = event.target.transaction;
          const billStore = tx.objectStore("bills");
          if (!billStore.indexNames.contains("userId")) {
            billStore.createIndex("userId", "userId", { unique: false });
          }
        }

        // Payments store
        if (!db.objectStoreNames.contains("payments")) {
          const paymentStore = db.createObjectStore("payments", {
            keyPath: "id",
          });
          paymentStore.createIndex("billId", "billId", { unique: false });
          paymentStore.createIndex("paymentDate", "paymentDate", {
            unique: false,
          });
          paymentStore.createIndex("method", "method", { unique: false });
          paymentStore.createIndex("userId", "userId", { unique: false });
        } else {
          const tx = event.target.transaction;
          const paymentStore = tx.objectStore("payments");
          if (!paymentStore.indexNames.contains("userId")) {
            paymentStore.createIndex("userId", "userId", { unique: false });
          }
        }

        // Renegotiations store
        if (!db.objectStoreNames.contains("renegotiations")) {
          const renoStore = db.createObjectStore("renegotiations", {
            keyPath: "id",
          });
          renoStore.createIndex("billId", "billId", { unique: false });
          renoStore.createIndex("status", "status", { unique: false });
          renoStore.createIndex("userId", "userId", { unique: false });
        } else {
          const tx = event.target.transaction;
          const renoStore = tx.objectStore("renegotiations");
          if (!renoStore.indexNames.contains("userId")) {
            renoStore.createIndex("userId", "userId", { unique: false });
          }
        }

        // Incomes store (new in v3)
        if (!db.objectStoreNames.contains("incomes")) {
          const incomeStore = db.createObjectStore("incomes", { keyPath: "id" });
          incomeStore.createIndex("date", "date", { unique: false });
          incomeStore.createIndex("type", "type", { unique: false });
          incomeStore.createIndex("userId", "userId", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
    });
  }

  /** Generate a unique ID */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /** Get the current user ID from Auth module */
  _getUserId() {
    return Auth && Auth.currentUser ? Auth.currentUser.id : null;
  }

  // ===================== RAW METHODS (no user scoping) =====================

  /** Get all records from a store (unscoped) */
  async getAllRaw(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Get a single record by ID (unscoped) */
  async getByIdRaw(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Add a new record (unscoped) */
  async addRaw(storeName, data) {
    if (!data.id) data.id = this.generateId();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.add(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  /** Update a record (unscoped) */
  async updateRaw(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  /** Delete a record (unscoped) */
  async deleteRaw(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ===================== SCOPED METHODS (per-user data) =====================

  /** Get all records for the current user */
  async getAll(storeName) {
    const userId = this._getUserId();
    const all = await this.getAllRaw(storeName);
    // Filter by current user
    return all.filter((item) => item.userId === userId);
  }

  /** Get a single record by ID (verifies user ownership) */
  async getById(storeName, id) {
    const record = await this.getByIdRaw(storeName, id);
    // Allow access if record belongs to current user or has no userId (legacy)
    if (record && record.userId && record.userId !== this._getUserId()) {
      return null;
    }
    return record;
  }

  /** Get records by index value (scoped to current user) */
  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => {
        const userId = this._getUserId();
        const results = request.result.filter(
          (item) => item.userId === userId
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** Add a new record (tagged with current user) */
  async add(storeName, data) {
    if (!data.id) data.id = this.generateId();
    data.userId = this._getUserId();
    data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.add(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  /** Update an existing record */
  async update(storeName, data) {
    data.updatedAt = new Date().toISOString();
    // Preserve userId
    if (!data.userId) data.userId = this._getUserId();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  /** Delete a record by ID */
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /** Clear all records from a store */
  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /** Export all data for the current user */
  async exportAll() {
    const bills = await this.getAll("bills");
    const payments = await this.getAll("payments");
    const renegotiations = await this.getAll("renegotiations");
    const incomes = await this.getAll("incomes");
    return {
      bills,
      payments,
      renegotiations,
      incomes,
      exportedAt: new Date().toISOString(),
    };
  }

  /** Clear all data for the current user (used by import-replace mode) */
  async clearUserData() {
    const stores = ["bills", "payments", "renegotiations", "incomes"];
    for (const storeName of stores) {
      const records = await this.getAll(storeName);
      for (const record of records) {
        await this.delete(storeName, record.id);
      }
    }
  }

  /** Import data from a backup — returns count of imported records */
  async importData(data) {
    let count = 0;
    if (data.bills) {
      for (const bill of data.bills) {
        bill.userId = this._getUserId();
        await this.update("bills", bill);
        count++;
      }
    }
    if (data.payments) {
      for (const payment of data.payments) {
        payment.userId = this._getUserId();
        await this.update("payments", payment);
        count++;
      }
    }
    if (data.renegotiations) {
      for (const reno of data.renegotiations) {
        reno.userId = this._getUserId();
        await this.update("renegotiations", reno);
        count++;
      }
    }
    if (data.incomes) {
      for (const income of data.incomes) {
        income.userId = this._getUserId();
        await this.update("incomes", income);
        count++;
      }
    }
    return count;
  }
}

// Singleton instance
const storage = new StorageService();
