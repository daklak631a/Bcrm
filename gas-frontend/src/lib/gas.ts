// Wrapper for google.script.run
interface GoogleScriptRun {
  withSuccessHandler<T>(handler: (value: T) => void): GoogleScriptRun
  withFailureHandler(handler: (error: unknown) => void): GoogleScriptRun
  [functionName: string]: unknown
}

declare global {
  interface Window {
    google?: {
      script?: {
        run: GoogleScriptRun
      }
    }
  }
}

export const gas = {
  call: <T>(functionName: string, ...args: unknown[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Check if we are running inside Google Apps Script.
      if (typeof window !== 'undefined' && window.google?.script?.run) {
        const runner = window.google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
        const callable = runner[functionName]

        if (typeof callable === 'function') {
          callable(...args)
        } else {
          reject(new Error(`Google Apps Script function not found: ${functionName}`))
        }
      } else {
        console.log(`[MOCK GAS] Calling ${functionName} with args:`, args)

        setTimeout(() => {
          if (functionName === 'getCurrentUser') {
            resolve({ email: 'local@dev.com', name: 'Local Dev', role: 'ADMIN_LEVEL_1' } as T)
          } else if (functionName === 'getAppData') {
            resolve({
              user: { email: 'local@dev.com', name: 'Local Dev', role: 'ADMIN_LEVEL_1' },
              customers: [{ ID: '1', name: 'Local Customer' }],
              accounts: [],
              interactions: [],
            } as T)
          } else {
            resolve({ success: true, message: 'Mock response' } as T)
          }
        }, 500)
      }
    })
  },
}
