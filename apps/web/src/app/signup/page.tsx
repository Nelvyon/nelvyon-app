"use client";
import React, { useState } from "react";
import { Container } from "@/components/agenforce/container";
import { Heading } from "@/components/agenforce/heading";
import { MarketingLayout } from "@/components/agenforce/marketing-layout";
import { Subheading } from "@/components/agenforce/subheading";
import { Button } from "@/components/agenforce/ui/button";
import Link from "next/link";
import { IconBrandGoogle, IconBrandGithub } from "@tabler/icons-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <MarketingLayout>
      <div className="w-full py-8 px-4 min-h-[70vh]">
        <Container className="max-w-md w-full">
          <div className="flex flex-col items-center">
            <Heading as="h1" className="text-center text-2xl md:text-3xl lg:text-4xl">
              Crea tu cuenta
            </Heading>
            <Subheading className="text-center mt-2">
              Empieza tu prueba gratis de 14 días en NELVYON
            </Subheading>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
            >
              <IconBrandGoogle className="size-5" />
              Continuar con Google
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
            >
              <IconBrandGithub className="size-5" />
              Continuar con GitHub
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-neutral-500">O continúa con email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
                placeholder="tu@empresa.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
                placeholder="Crea una contraseña"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
                placeholder="Repite tu contraseña"
              />
            </div>

            <Button type="submit" className="w-full py-3 h-auto">
              Crear cuenta
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-500">
            Al registrarte aceptas nuestros{" "}
            <Link href="/terms" className="underline hover:text-neutral-700 dark:hover:text-neutral-300">
              Términos
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="underline hover:text-neutral-700 dark:hover:text-neutral-300">
              Privacidad
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-neutral-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
          </p>
        </Container>
      </div>
    </MarketingLayout>
  );
}
