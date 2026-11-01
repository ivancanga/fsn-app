"use client";

import { Logo } from "../../styled";

type AdminLoginProps = {
  password: string;
  onPasswordChange: (password: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AdminLogin({ password, onPasswordChange, onSubmit }: AdminLoginProps) {
  return (
    <main className="min-h-screen text-white px-6 py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo><h1>FSN</h1></Logo>
          <h2 className="text-3xl font-bold mt-6 uppercase [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">Admin</h2>
        </div>
        <form onSubmit={onSubmit} className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl">
          <label htmlFor="password" className="block text-sm font-semibold mb-2">Contraseña</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="w-full px-4 py-2 mb-6 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40"
            placeholder="Ingresá la contraseña"
          />
          <button type="submit" className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl font-bold transition-all duration-300">Ingresar</button>
        </form>
      </div>
    </main>
  );
}
