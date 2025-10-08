import React from 'react'

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-surface">
        <nav className="p-40">
        </nav>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Logo above welcome text */}
            <img src="/logo.png" style={{ height: 120, marginBottom: 16 }} />
            <span style={{ fontSize: 32 }}>
            Welcome to BesPick!
            </span>
            <button
                className="mt-10 px-10 py-2 bg-brand text-white rounded hover:bg-brand-dark cursor-pointer transition-shadow hover:brand-hover"
            >
                Log In
            </button>
        </div>
    </div>
  )
}

export default LoginPage
