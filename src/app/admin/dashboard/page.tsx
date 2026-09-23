
"use client";

import Image from "next/image";
import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";

// ==========================================
// TIPOS
// ==========================================

type Resumo = {
  total: number;
  pendentes: number;
  aprovados: number;
  rejeitados: number;
};

type Modulo = {
  titulo: string;
  descricao: string;
  href: string;
  icone: string;
  cor: "purple" | "green" | "blue";
  detalhe: string;
};

// ==========================================
// ROTAS ADMINISTRATIVAS
// ==========================================

const ROTAS = {
  login: "/admin/login",
  dashboard: "/admin/dashboard",
  pedidos: "/admin/pedidos",
  empresas: "/admin/status",
  promocoes: "/admin/promocoes",
};

// ==========================================
// MÓDULOS DA DASHBOARD
// ==========================================

const modulos: Modulo[] = [
  {
    titulo: "Pedidos",
    descricao:
      "Visualize os pedidos recebidos, acompanhe as entregas e gerencie as vendas.",
    href: ROTAS.pedidos,
    icone: "📦",
    cor: "purple",
    detalhe: "Gerenciar pedidos",
  },

  {
    titulo: "Status das empresas",
    descricao:
      "Consulte os cadastros dos parceiros, aprove ou rejeite novas solicitações.",
    href: ROTAS.empresas,
    icone: "🏪",
    cor: "green",
    detalhe: "Gerenciar parceiros",
  },

  {
    titulo: "Promoções",
    descricao:
      "Crie e gerencie ofertas especiais para a barra de açaí.",
    href: ROTAS.promocoes,
    icone: "🏷️",
    cor: "blue",
    detalhe: "Gerenciar promoções",
  },
];

// ==========================================
// DASHBOARD ADMINISTRATIVA
// ==========================================

export default function AdminDashboard() {
  const router = useRouter();

  // ========================================
  // ESTADOS
  // ========================================

  const [carregando, setCarregando] =
    useState(true);

  const [autorizado, setAutorizado] =
    useState(false);

  const [saindo, setSaindo] =
    useState(false);

  const [emailAdmin, setEmailAdmin] =
    useState("");

  const [erro, setErro] =
    useState("");

  const [resumo, setResumo] =
    useState<Resumo | null>(null);

  // ========================================
  // VERIFICAR ADMINISTRADOR
  // ========================================

  useEffect(() => {
    let ativo = true;

    let cancelarParceiros:
      (() => void) | undefined;

    const cancelarAuth = onAuthStateChanged(
      auth,

      async (usuario) => {
        // CANCELAR CONSULTA ANTERIOR

        if (cancelarParceiros) {
          cancelarParceiros();
          cancelarParceiros = undefined;
        }

        if (!ativo) return;

        setCarregando(true);
        setAutorizado(false);
        setResumo(null);
        setErro("");

        // USUÁRIO NÃO AUTENTICADO

        if (!usuario) {
          router.replace(ROTAS.login);
          return;
        }

        try {
          // ==================================
          // CONSULTAR ADMINISTRADOR
          // ==================================

          const adminRef = doc(
            db,
            "admins",
            usuario.uid
          );

          const adminSnapshot =
            await getDoc(adminRef);

          if (!ativo) return;

          // ==================================
          // VERIFICAR PERMISSÃO
          // ==================================

          if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin" ||
            adminSnapshot.data().ativo !== true
          ) {
            await signOut(auth);

            if (ativo) {
              router.replace(ROTAS.login);
            }

            return;
          }

          // ==================================
          // ADMIN AUTORIZADO
          // ==================================

          setAutorizado(true);

          setEmailAdmin(
            usuario.email || ""
          );

          setCarregando(false);

          // ==================================
          // CONSULTAR PARCEIROS EM TEMPO REAL
          // ==================================

          cancelarParceiros = onSnapshot(
            collection(db, "parceiros"),

            (snapshot) => {
              if (!ativo) return;

              let pendentes = 0;
              let aprovados = 0;
              let rejeitados = 0;

              snapshot.forEach((documento) => {
                const dados = documento.data();

                if (dados.status === "pendente") {
                  pendentes++;
                }

                if (dados.status === "aprovado") {
                  aprovados++;
                }

                if (dados.status === "rejeitado") {
                  rejeitados++;
                }
              });

              // ATUALIZAR INDICADORES

              setResumo({
                total: snapshot.size,
                pendentes,
                aprovados,
                rejeitados,
              });

              setErro("");
            },

            (error) => {
              console.error(
                "Erro ao consultar parceiros:",
                error
              );

              if (ativo) {
                setResumo(null);

                setErro(
                  "Não foi possível carregar os indicadores. Verifique as permissões do Firestore."
                );
              }
            }
          );
        } catch (error) {
          console.error(
            "Erro ao verificar administrador:",
            error
          );

          if (ativo) {
            setAutorizado(false);

            setErro(
              "Não foi possível verificar sua autorização administrativa."
            );

            setCarregando(false);
          }
        }
      }
    );

    // ========================================
    // LIMPEZA
    // ========================================

    return () => {
      ativo = false;

      cancelarAuth();

      if (cancelarParceiros) {
        cancelarParceiros();
      }
    };
  }, [router]);

  // ========================================
  // SAIR DA CONTA
  // ========================================

  async function sairDaConta() {
    if (saindo) return;

    setSaindo(true);
    setErro("");

    try {
      await signOut(auth);

      router.replace(ROTAS.login);
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );

      setErro(
        "Não foi possível encerrar sua sessão."
      );

      setSaindo(false);
    }
  }

  // ========================================
  // TELA DE CARREGAMENTO
  // ========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#08050e] px-6 text-white">

        <Image
          src="/mago.png"
          alt="Mago do Açaí do Bruxo"
          width={150}
          height={180}
          priority
          className="h-auto w-32 object-contain"
        />

        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500" />

        <p className="text-center text-sm text-purple-300">
          Preparando seu painel administrativo...
        </p>

      </main>
    );
  }

  // ========================================
  // ACESSO NÃO AUTORIZADO
  // ========================================

  if (!autorizado) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#08050e] px-6 text-center text-white">

        <Image
          src="/mago.png"
          alt="Açaí do Bruxo"
          width={130}
          height={160}
          className="h-auto w-28"
        />

        <h1 className="text-2xl font-black">
          Acesso não autorizado
        </h1>

        <p className="max-w-sm text-sm text-gray-400">
          {erro ||
            "Esta área é exclusiva para administradores."}
        </p>

        <Link
          href={ROTAS.login}
          className="rounded-xl bg-purple-600 px-7 py-4 font-bold transition hover:bg-purple-500"
        >
          Voltar ao login
        </Link>

      </main>
    );
  }

  // ========================================
  // INTERFACE PRINCIPAL
  // ========================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08050e] text-white">

      {/* =====================================
          CABEÇALHO
      ===================================== */}

      <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-black/95 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">

          {/* LOGOTIPO */}

          <div className="min-w-0">

            <h1 className="text-base font-black tracking-tight sm:text-xl">

              AÇAÍ DO{" "}

              <span className="text-purple-400">
                BRUXO
              </span>

            </h1>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[2px] text-purple-300 sm:text-[10px]">

              Painel administrativo

            </p>

          </div>

          {/* SAIR DA CONTA */}

          <button
            type="button"
            onClick={sairDaConta}
            disabled={saindo}
            className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50 sm:px-6 sm:text-sm"
          >

            {saindo
              ? "Saindo..."
              : "Sair da conta"}

          </button>

        </div>

      </header>

      {/* =====================================
          CONTEÚDO PRINCIPAL
      ===================================== */}

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">

        {/* =====================================
            APRESENTAÇÃO
        ===================================== */}

        <section className="relative overflow-hidden rounded-[28px] border border-purple-500/20 bg-gradient-to-br from-[#271039] via-[#190d28] to-[#08050e] px-6 py-8 sm:px-10 sm:py-12">

          {/* LUZES */}

          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-purple-600/20 blur-[100px]" />

          <div className="pointer-events-none absolute -bottom-20 left-0 h-60 w-60 rounded-full bg-blue-600/10 blur-[90px]" />

          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_220px]">

            {/* TEXTO */}

            <div>

              <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[2px] text-green-400">

                <span className="h-2 w-2 rounded-full bg-green-400" />

                Painel do proprietário

              </span>

              <h2 className="mt-6 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">

                BEM-VINDO AO
                <br />

                <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">

                  SEU IMPÉRIO.

                </span>

              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">

                Controle seus parceiros, acompanhe seus
                pedidos e gerencie as promoções do
                Açaí do Bruxo em um só lugar.

              </p>

              {/* CONTA ADMINISTRATIVA */}

              <div className="mt-7 inline-flex max-w-full items-center gap-3 rounded-xl border border-purple-500/20 bg-black/20 px-4 py-3">

                <span className="text-purple-400">
                  🔒
                </span>

                <span className="min-w-0 break-all text-xs text-gray-300">

                  {emailAdmin}

                </span>

              </div>

            </div>

            {/* IMAGEM DO MAGO */}

            <div className="relative flex justify-center">

              <div className="pointer-events-none absolute inset-0 rounded-full bg-purple-600/20 blur-[70px]" />

              <Image
                src="/mago.png"
                alt="Mago do Açaí do Bruxo"
                width={300}
                height={350}
                priority
                className="relative h-auto w-40 object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.35)] sm:w-52"
              />

            </div>

          </div>

        </section>

        {/* =====================================
            MENSAGEM DE ERRO
        ===================================== */}

        {erro && (

          <div
            role="alert"
            className="mt-7 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300"
          >

            {erro}

          </div>

        )}

        {/* =====================================
            RESUMO DO NEGÓCIO
        ===================================== */}

        <section className="mt-12">

          <div className="mb-6">

            <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">

              Visão geral

            </span>

            <h2 className="mt-3 text-2xl font-black sm:text-3xl">

              Resumo do negócio

            </h2>

          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">

            {/* TOTAL */}

            <div className="rounded-2xl border border-purple-500/20 bg-[#1a1025] p-4 sm:p-6">

              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 text-xl">

                👥

              </div>

              <p className="text-3xl font-black sm:text-4xl">

                {resumo?.total ?? "—"}

              </p>

              <p className="mt-3 text-xs text-gray-400 sm:text-sm">

                Total de parceiros

              </p>

            </div>

            {/* PENDENTES */}

            <div className="rounded-2xl border border-yellow-500/20 bg-[#1a1025] p-4 sm:p-6">

              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-xl">

                ⏳

              </div>

              <p className="text-3xl font-black text-yellow-400 sm:text-4xl">

                {resumo?.pendentes ?? "—"}

              </p>

              <p className="mt-3 text-xs text-gray-400 sm:text-sm">

                Aguardando aprovação

              </p>

            </div>

            {/* APROVADOS */}

            <div className="rounded-2xl border border-green-500/20 bg-[#1a1025] p-4 sm:p-6">

              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-xl">

                ✅

              </div>

              <p className="text-3xl font-black text-green-400 sm:text-4xl">

                {resumo?.aprovados ?? "—"}

              </p>

              <p className="mt-3 text-xs text-gray-400 sm:text-sm">

                Parceiros aprovados

              </p>

            </div>

            {/* REJEITADOS */}

            <div className="rounded-2xl border border-red-500/20 bg-[#1a1025] p-4 sm:p-6">

              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-xl">

                🚫

              </div>

              <p className="text-3xl font-black text-red-400 sm:text-4xl">

                {resumo?.rejeitados ?? "—"}

              </p>

              <p className="mt-3 text-xs text-gray-400 sm:text-sm">

                Solicitações rejeitadas

              </p>

            </div>

          </div>

        </section>

        {/* =====================================
            CENTRAL DE CONTROLE
        ===================================== */}

        <section className="mt-14">

          <div className="mb-7">

            <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">

              Central de controle

            </span>

            <h2 className="mt-3 text-2xl font-black sm:text-3xl">

              Gerenciamento

            </h2>

            <p className="mt-3 text-sm text-gray-400">

              Escolha a área que deseja administrar.

            </p>

          </div>

          {/* =====================================
              CARDS COM LINKS FUNCIONAIS
          ===================================== */}

          <div className="grid gap-4 lg:grid-cols-3">

            {modulos.map((modulo) => (

              <Link
                key={modulo.href}
                href={modulo.href}
                className="group flex h-full flex-col rounded-[24px] border border-purple-500/20 bg-[#1a1025] p-5 transition duration-300 hover:-translate-y-1 hover:border-purple-400/50 hover:bg-[#241331] hover:shadow-[0_15px_50px_rgba(126,34,206,0.12)] sm:p-7"
              >

                {/* ÍCONE */}

                <div className="flex items-center justify-between gap-4">

                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                      modulo.cor === "purple"
                        ? "bg-purple-500/15"
                        : modulo.cor === "green"
                        ? "bg-green-500/15"
                        : "bg-blue-500/15"
                    }`}
                  >

                    {modulo.icone}

                  </div>

                  <span className="text-xl text-purple-400 transition group-hover:translate-x-1">

                    →

                  </span>

                </div>

                {/* TÍTULO */}

                <h3 className="mt-6 text-xl font-black sm:text-2xl">

                  {modulo.titulo}

                </h3>

                {/* DESCRIÇÃO */}

                <p className="mt-3 flex-1 text-sm leading-7 text-gray-400">

                  {modulo.descricao}

                </p>

                {/* LINK INFERIOR */}

                <div className="mt-7 flex items-center justify-between gap-3 border-t border-purple-500/15 pt-5">

                  <span
                    className={`text-xs font-bold ${
                      modulo.cor === "purple"
                        ? "text-purple-400"
                        : modulo.cor === "green"
                        ? "text-green-400"
                        : "text-blue-400"
                    }`}
                  >

                    {modulo.detalhe}

                  </span>

                  <span className="shrink-0 text-sm text-gray-500 transition group-hover:text-white">

                    Acessar →

                  </span>

                </div>

              </Link>

            ))}

          </div>

        </section>

        {/* =====================================
            SOLICITAÇÕES PENDENTES
        ===================================== */}

        {resumo !== null &&
          resumo.pendentes > 0 && (

          <section className="mt-12">

            <div className="flex flex-col gap-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <span className="text-xl">

                    🔔

                  </span>

                  <h3 className="font-black text-yellow-300">

                    Solicitações aguardando análise

                  </h3>

                </div>

                <p className="mt-3 text-sm leading-7 text-gray-400">

                  Você possui {resumo.pendentes}{" "}

                  {resumo.pendentes === 1
                    ? "parceiro aguardando"
                    : "parceiros aguardando"}{" "}

                  aprovação.

                </p>

              </div>

              {/* BOTÃO PARA STATUS */}

              <Link
                href={ROTAS.empresas}
                className="shrink-0 rounded-xl bg-yellow-500 px-6 py-4 text-center text-sm font-black text-black transition hover:bg-yellow-400"
              >

                Analisar solicitações →

              </Link>

            </div>

          </section>

        )}

      </div>

      {/* =====================================
          RODAPÉ
      ===================================== */}

      <footer className="border-t border-purple-500/10 bg-black px-5 py-8">

        <div className="mx-auto max-w-7xl text-center">

          <h2 className="text-lg font-black">

            AÇAÍ DO{" "}

            <span className="text-purple-400">

              BRUXO

            </span>

          </h2>

          <p className="mt-2 text-[10px] uppercase tracking-[2px] text-purple-400">

            Administração exclusiva

          </p>

          <p className="mt-5 text-xs text-gray-600">

            © {new Date().getFullYear()} Açaí do Bruxo.

          </p>

        </div>

      </footer>

    </main>
  );
}