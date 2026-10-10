export async function saveCodeArchive(agentId: string, file: File): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("evalforge-attachments", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("archives");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Could not open archive storage."));
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("archives", "readwrite");
      transaction.objectStore("archives").put(file, agentId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Could not save the ZIP file in this browser."));
      transaction.onabort = () => reject(new Error("ZIP upload was interrupted."));
    });
  } finally {
    database.close();
  }
}
