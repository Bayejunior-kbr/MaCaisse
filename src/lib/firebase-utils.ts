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
      if (error.message.includes('the client is offline')) {
        console.error("❌ ERREUR DE CONFIGURATION FIREBASE ❌");
        console.error(`Le domaine actuel (${currentDomain}) n'est pas autorisé.`);
        console.error("\n--- DOMAINES À AJOUTER DANS LA CONSOLE FIREBASE ---");
        console.error("1. ais-dev-ox2d3duaol7vt7fmn2z2on-133025908803.europe-west2.run.app");
        console.error("2. ais-pre-ox2d3duaol7vt7fmn2z2on-133025908803.europe-west2.run.app");
        console.error("--------------------------------------------------\n");
        console.error("Allez dans : Authentication -> Settings -> Authorized Domains");
        console.error("\nAUTRES CAUSES POSSIBLES :");
        console.error("- L'API Firestore n'est pas activée dans Google Cloud Console.");
        console.error("- Votre clé API a des restrictions HTTP (Referrer) qui bloquent ce domaine.");
        console.error("- Un bloqueur de publicité bloque 'firestore.googleapis.com'.");
      } else {
        console.error(`Firestore connection error on ${currentDomain}:`, error.message);
      }
    } else {
      console.error(`Unknown Firestore connection error on ${currentDomain}:`, error);
    }
    // Other errors are ignored as this is just a test
  }
}
