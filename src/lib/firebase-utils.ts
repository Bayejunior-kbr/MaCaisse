import { doc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection() {
  try {
    // Attempt to get a dummy document to test connection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error) {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('permission-denied')) {
        console.error("❌ ERREUR DE CONFIGURATION FIREBASE ❌");
        const msg = "Domaine non autorisé ou erreur de permission Firestore.";
        console.error(msg);
        throw new Error(msg);
      } else {
        console.error(`Firestore connection error on ${currentDomain}:`, error.message);
      }
    }
 else {
      console.error(`Unknown Firestore connection error on ${currentDomain}:`, error);
    }
    // Other errors are ignored as this is just a test
  }
}
