export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  size?: string;
}

export interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Lists files and folders in a Google Drive directory.
 * Filters for folders and image files.
 */
export async function listDriveFiles(
  accessToken: string,
  folderId: string = 'root'
): Promise<DriveListResponse> {
  const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType starts with 'image/')`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,size)&pageSize=100&orderBy=folder,name`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list Drive files: ${errorText}`);
  }

  return await res.json();
}

/**
 * Downloads a Google Drive file as a Blob.
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string
): Promise<Blob> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to download Drive file: ${errorText}`);
  }

  return await res.blob();
}

/**
 * Creates a folder in Google Drive.
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const url = 'https://www.googleapis.com/drive/v3/files';
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create folder: ${errorText}`);
  }

  return await res.json();
}

/**
 * Searches for a folder by name, and creates it if it doesn't exist.
 */
export async function getOrCreateCoutureFolder(
  accessToken: string,
  folderName: string = 'Kanchipuram Couture'
): Promise<string> {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to find folder: ${errorText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const folder = await createDriveFolder(accessToken, folderName);
  return folder.id;
}

/**
 * Uploads a file (Blob) to Google Drive using a multipart upload.
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileBlob: Blob,
  filename: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const metadata = {
    name: filename,
    mimeType: fileBlob.type,
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const boundary = 'kanchipuram_drive_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  // Read file as ArrayBuffer
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(fileBlob);
  });

  const encoder = new TextEncoder();
  const header = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${fileBlob.type}\r\n\r\n`;
    
  const footer = closeDelim;

  const headerBytes = encoder.encode(header);
  const footerBytes = encoder.encode(footer);
  const fileBytes = new Uint8Array(arrayBuffer);

  const bodyBytes = new Uint8Array(headerBytes.length + fileBytes.length + footerBytes.length);
  bodyBytes.set(headerBytes, 0);
  bodyBytes.set(fileBytes, headerBytes.length);
  bodyBytes.set(footerBytes, headerBytes.length + fileBytes.length);

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: bodyBytes,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Upload to Drive failed: ${errorText}`);
  }

  return await res.json();
}
