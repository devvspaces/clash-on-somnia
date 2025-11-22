'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords, Sparkles, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(identifier, password);
      router.push('/village');
    } catch (error) {
      // Error is handled in the store
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/bg/map001.svg')",
          filter: 'brightness(0.3)',
        }}
      />

      {/* Gradient Overlays */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />
      <div className="fixed inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-blue-900/20" />

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          >
            <Sparkles
              className="text-amber-500/20"
              size={Math.random() * 20 + 10}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Swords className="w-7 h-7 text-white" />
              </div>
              <h1
                className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
                style={{ letterSpacing: '0.15em' }}
              >
                CLASH ON SOMNIA
              </h1>
            </div>

            {/* Blockchain Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm animate-pulse-glow">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Powered by Somnia
              </span>
            </div>
          </div>

          {/* Login Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-2xl">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
            </div>

            <div className="relative p-8">
              <CardHeader className="text-center px-0 pt-0 pb-6">
                <CardTitle
                  className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  WELCOME BACK
                </CardTitle>
                <CardDescription className="text-gray-400 mt-2">
                  Enter your village
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="identifier"
                      className="text-sm font-medium text-gray-300"
                      style={{ fontFamily: 'KnightWarrior, sans-serif', letterSpacing: '0.05em' }}
                    >
                      Username or Email
                    </label>
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter your username or email"
                      required
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:ring-amber-500/50 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-300"
                      style={{ fontFamily: 'KnightWarrior, sans-serif', letterSpacing: '0.05em' }}
                    >
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      minLength={8}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:ring-amber-500/50 h-12"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-3 text-sm text-red-300 backdrop-blur-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/50"
                    disabled={isLoading}
                    style={{ letterSpacing: '0.08em' }}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Logging in...
                      </div>
                    ) : (
                      'LOGIN'
                    )}
                  </Button>

                  <div className="text-center text-sm pt-4">
                    <span className="text-gray-400">Don't have an account? </span>
                    <Link
                      href="/register"
                      className="font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent hover:from-amber-300 hover:to-orange-400 transition-all"
                    >
                      Create Village
                    </Link>
                  </div>
                </form>
              </CardContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
