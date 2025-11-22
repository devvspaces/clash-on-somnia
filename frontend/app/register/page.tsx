'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords, Sparkles, Zap } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setValidationError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    try {
      await register(username, email, password);
      router.push('/village');
    } catch (error) {
      // Error is handled in the store
    }
  };

  const displayError = validationError || error;

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

          {/* Register Card */}
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
                  CREATE VILLAGE
                </CardTitle>
                <CardDescription className="text-gray-400 mt-2">
                  Begin your conquest
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="username"
                      className="text-sm font-medium text-gray-300"
                      style={{ fontFamily: 'KnightWarrior, sans-serif', letterSpacing: '0.05em' }}
                    >
                      Username
                    </label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      required
                      minLength={3}
                      maxLength={50}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:ring-amber-500/50 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-300"
                      style={{ fontFamily: 'KnightWarrior, sans-serif', letterSpacing: '0.05em' }}
                    >
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
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
                      placeholder="Create a password"
                      required
                      minLength={8}
                      maxLength={100}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:ring-amber-500/50 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-gray-300"
                      style={{ fontFamily: 'KnightWarrior, sans-serif', letterSpacing: '0.05em' }}
                    >
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      minLength={8}
                      maxLength={100}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:ring-amber-500/50 h-12"
                    />
                  </div>

                  {displayError && (
                    <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-3 text-sm text-red-300 backdrop-blur-sm">
                      {displayError}
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
                        Creating...
                      </div>
                    ) : (
                      'CREATE ACCOUNT'
                    )}
                  </Button>

                  <div className="text-center text-sm pt-4">
                    <span className="text-gray-400">Already have an account? </span>
                    <Link
                      href="/login"
                      className="font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent hover:from-amber-300 hover:to-orange-400 transition-all"
                    >
                      Login
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
