import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  // On the server, this will read the environment variable at build/request time.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  return (
    <>
      <div style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          right: '1rem',
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          textAlign: 'center',
          zIndex: 10000,
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          color: 'hsl(var(--foreground))'
      }}>
          <p style={{ fontWeight: '600', fontSize: '1rem' }}>Diagnostic Information</p>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            This application is attempting to connect to the following Firebase Project ID:
          </p>
          <p style={{ 
              marginTop: '0.75rem', 
              fontFamily: 'monospace', 
              fontWeight: '700', 
              fontSize: '1.125rem',
              color: projectId ? 'hsl(var(--accent))' : 'hsl(var(--destructive))',
              backgroundColor: 'hsl(var(--muted))',
              padding: '0.25rem 0.75rem',
              borderRadius: 'calc(var(--radius) - 4px)',
              display: 'inline-block'
            }}>
              {projectId || "PROJECT ID IS MISSING IN .env"}
          </p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            If this ID is missing or incorrect, please fix the `NEXT_PUBLIC_FIREBASE_PROJECT_ID` variable in your `.env` file and **restart the development server**.
          </p>
      </div>
      <LoginForm />
    </>
  );
}
