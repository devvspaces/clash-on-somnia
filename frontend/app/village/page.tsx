'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useVillageStore } from '@/lib/stores';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Swords } from 'lucide-react';

export default function VillagePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { village, isLoading: villageLoading, fetchVillage } = useVillageStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !village && !villageLoading) {
      fetchVillage();
    }
  }, [isAuthenticated, village, villageLoading, fetchVillage]);

  if (authLoading || villageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Loading your village...</h2>
          <p className="mt-2 text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  if (!village) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Village not found</h2>
          <p className="mt-2 text-muted-foreground">Unable to load your village</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 dark:from-green-950 dark:via-blue-950 dark:to-purple-950">
      <Navbar />

      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{village.name}</h1>
          <p className="text-muted-foreground">Welcome back, Chief!</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Buildings
              </CardTitle>
              <CardDescription>Manage your village structures</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{village.buildings.length}</p>
              <p className="text-sm text-muted-foreground">Total buildings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Army
              </CardTitle>
              <CardDescription>Train and manage troops</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                Battles
              </CardTitle>
              <CardDescription>Attack other villages</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Coming in Phase 5</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Village Grid</CardTitle>
              <CardDescription>Your village layout (Phase 3: Building Placement)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex aspect-square max-h-[600px] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                <div className="text-center">
                  <Building2 className="mx-auto h-16 w-16 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium text-muted-foreground">
                    Village grid coming soon
                  </p>
                  <p className="text-sm text-muted-foreground">Phase 3: Building Placement</p>
                  <div className="mt-4">
                    <p className="text-sm">
                      You currently have: <strong>{village.buildings.length} building(s)</strong>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
