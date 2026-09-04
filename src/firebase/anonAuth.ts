import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { auth } from './config'

export function ensureSignedIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe()
        if (user) {
          resolve(user)
        } else {
          signInAnonymously(auth)
            .then((credential) => resolve(credential.user))
            .catch(reject)
        }
      },
      reject,
    )
  })
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}
