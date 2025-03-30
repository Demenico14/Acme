"use client";

import type React from "react";

import { useState } from "react";
import { GalleryVerticalEnd, Shield } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface AdminSignupFormProps extends React.ComponentPropsWithoutRef<"div"> {
  adminCodeValid: boolean;
  onAdminCodeSubmit: (code: string) => void;
  onAdminSignup: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export function AdminSignupForm({
  className,
  adminCodeValid,
  onAdminCodeSubmit,
  onAdminSignup,
  ...props
}: AdminSignupFormProps) {
  const [adminCode, setAdminCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdminCodeSubmit(adminCode);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await onAdminSignup(email, password, name);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to create admin account.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <div className="flex h-8 w-8 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-6" />
          </div>
          <span className="sr-only">Acme Inc.</span>
        </Link>
        <h1 className="text-xl font-bold">Admin Registration</h1>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/" className="underline underline-offset-4">
            Login
          </Link>
        </div>
      </div>

      {!adminCodeValid ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Enter the admin code to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminCodeSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="adminCode">Admin Code</Label>
                  <Input
                    id="adminCode"
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Verify Code
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSignup}>
          <div className="flex flex-col gap-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full flex items-center gap-2"
                disabled={isLoading}
              >
                <Shield className="h-4 w-4" />
                {isLoading
                  ? "Creating Admin Account..."
                  : "Create Admin Account"}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our
        <Link
          href="/terms-of-service"
          className=" text-muted-foreground hover:text-primary"
        >
          Terms of Service
        </Link>
        and
        <Link
          href="/privacy-policy"
          className=" text-muted-foreground hover:text-primary"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}